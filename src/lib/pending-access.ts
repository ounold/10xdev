import type { StudentLinkClaimStatus, StudentLinkClaimability } from "@/lib/database";

export interface PendingAccessViewModel {
  body: string;
  detail: string | null;
  feedback: string | null;
  can_claim: boolean;
}

const claimErrorMessages: Partial<Record<StudentLinkClaimStatus, string>> = {
  "already-linked": "This account was already linked. Try opening the dashboard again.",
  "ambiguous-match":
    "More than one student record matches this email, so access stays blocked until the professor resolves the duplicate.",
  "missing-email": "This account does not have a usable email address for student linking.",
  "missing-match":
    "No prepared student record matches this email yet. Ask the professor to add or correct your email first.",
};

export function getClaimErrorMessage(claimError: string | null) {
  if (!claimError) {
    return null;
  }

  return claimErrorMessages[claimError as StudentLinkClaimStatus] ?? claimError;
}

export function buildPendingAccessViewModel({
  claimability,
  claimabilityError,
  claimError,
  isLinkedStudent,
}: {
  claimability: StudentLinkClaimability | null;
  claimabilityError: string | null;
  claimError: string | null;
  isLinkedStudent: boolean;
}): PendingAccessViewModel {
  const feedback = getClaimErrorMessage(claimError) ?? claimabilityError;

  if (isLinkedStudent) {
    return {
      body: "This account is already linked to a student profile. If you still see this page, the student dashboard route is not being reached correctly.",
      detail: null,
      feedback,
      can_claim: false,
    };
  }

  if (claimability?.status === "claimable" && claimability.target) {
    return {
      body: `Your professor already prepared a student record for this email. You can now link this account to ${claimability.target.full_name} and continue into the student dashboard.`,
      detail:
        "The link uses your current signed-in email and only succeeds when exactly one unlinked student record matches it.",
      feedback,
      can_claim: true,
    };
  }

  if (claimability?.status === "ambiguous-match") {
    return {
      body: "We found more than one prepared student record for this email, so the app will not choose one automatically.",
      detail: "Ask the professor workspace owner to resolve the duplicate student rows, then try again.",
      feedback,
      can_claim: false,
    };
  }

  if (claimability?.status === "missing-match") {
    return {
      body: "This account exists, but there is no prepared student record for this email yet.",
      detail: "Ask the professor workspace owner to add your email to the correct student thread, then return here.",
      feedback,
      can_claim: false,
    };
  }

  if (claimability?.status === "missing-email") {
    return {
      body: "This account does not expose a usable email address for student linking.",
      detail: "Sign in with an email-based account or contact the professor workspace owner.",
      feedback,
      can_claim: false,
    };
  }

  return {
    body: "This account exists, but it has not been assigned professor access or linked student access yet.",
    detail: "Please contact the professor workspace owner if you believe you should already have access.",
    feedback,
    can_claim: false,
  };
}
