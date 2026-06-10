export const UPDATE_PASSWORD_ROUTE = "/auth/update-password";
export const AUTH_CONFIRM_ROUTE = "/auth/confirm";
export const RECOVERY_READY_QUERY = "recovery=ready";

type RecoveryVerificationRequest =
  | {
      kind: "exchange-code";
      code: string;
    }
  | {
      kind: "verify-otp";
      tokenHash: string;
    }
  | {
      kind: "set-session";
      accessToken: string;
      refreshToken: string;
    }
  | {
      kind: "invalid";
      error: string;
    };

function encodeRecoveryMessage(message: string) {
  return encodeURIComponent(message);
}

export function buildRecoveryReadyRedirect() {
  return `${UPDATE_PASSWORD_ROUTE}?${RECOVERY_READY_QUERY}`;
}

export function buildRecoveryErrorRedirect(message: string) {
  return `${UPDATE_PASSWORD_ROUTE}?error=${encodeRecoveryMessage(message)}`;
}

export function buildRecoveryRedirectTo(origin: string) {
  return new URL(UPDATE_PASSWORD_ROUTE, origin).toString();
}

export function buildAuthConfirmRedirect(next: string = UPDATE_PASSWORD_ROUTE) {
  return `${AUTH_CONFIRM_ROUTE}?next=${encodeURIComponent(next)}`;
}

export function sanitizeRecoveryNext(next: string | null) {
  if (!next?.startsWith("/")) {
    return UPDATE_PASSWORD_ROUTE;
  }

  return next;
}

export function getRecoveryVerificationRequest(url: URL): RecoveryVerificationRequest {
  const code = url.searchParams.get("code");
  if (code) {
    return { kind: "exchange-code", code };
  }

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (tokenHash && type === "recovery") {
    return { kind: "verify-otp", tokenHash };
  }

  const accessToken = url.searchParams.get("access_token");
  const refreshToken = url.searchParams.get("refresh_token");
  if (accessToken && refreshToken) {
    return {
      kind: "set-session",
      accessToken,
      refreshToken,
    };
  }

  return {
    kind: "invalid",
    error: "This password recovery link is invalid or has expired. Request a new reset email to try again.",
  };
}
