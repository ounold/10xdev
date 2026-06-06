import { describe, expect, it } from "vitest";

import { buildPendingAccessViewModel, getClaimErrorMessage } from "@/lib/pending-access";

describe("pending-access view model", () => {
  it("renders a claim action only for one safe claimable student match", () => {
    const viewModel = buildPendingAccessViewModel({
      claimability: {
        status: "claimable",
        normalized_email: "student@example.com",
        target: {
          student_id: "student-1",
          full_name: "Claim Target",
          email: "student@example.com",
        },
        conflict_count: 1,
      },
      claimabilityError: null,
      claimError: null,
      isLinkedStudent: false,
    });

    expect(viewModel.can_claim).toBe(true);
    expect(viewModel.body).toContain("Claim Target");
  });

  it("keeps duplicate matches blocked and surfaces a clear blocked-state message", () => {
    const viewModel = buildPendingAccessViewModel({
      claimability: {
        status: "ambiguous-match",
        normalized_email: "student@example.com",
        target: null,
        conflict_count: 2,
      },
      claimabilityError: null,
      claimError: "ambiguous-match",
      isLinkedStudent: false,
    });

    expect(viewModel.can_claim).toBe(false);
    expect(viewModel.body).toContain("more than one prepared student record");
    expect(viewModel.feedback).toContain("access stays blocked");
  });

  it("keeps no-match students blocked without professor-only fallback copy", () => {
    const viewModel = buildPendingAccessViewModel({
      claimability: {
        status: "missing-match",
        normalized_email: "student@example.com",
        target: null,
        conflict_count: 0,
      },
      claimabilityError: null,
      claimError: null,
      isLinkedStudent: false,
    });

    expect(viewModel.can_claim).toBe(false);
    expect(viewModel.body).toContain("no prepared student record");
    expect(viewModel.detail).toContain("add your email");
  });

  it("maps known claim errors to user-facing feedback", () => {
    expect(getClaimErrorMessage("missing-match")).toContain("No prepared student record matches this email yet");
    expect(getClaimErrorMessage("already-linked")).toContain("already linked");
  });
});
