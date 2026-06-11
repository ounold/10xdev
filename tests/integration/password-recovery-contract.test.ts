import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(),
}));

import {
  AUTH_CONFIRM_ROUTE,
  buildAuthConfirmRedirect,
  buildRecoveryErrorRedirect,
  buildRecoveryReadyRedirect,
  sanitizeRecoveryNext,
  UPDATE_PASSWORD_ROUTE,
} from "@/lib/auth-recovery";
import { POST as updatePasswordPost } from "@/pages/api/auth/update-password";
import { GET as authConfirmGet } from "@/pages/auth/confirm";
import { POST as resetPasswordPost } from "@/pages/api/auth/reset-password";

function createRouteContext(url: string, init?: RequestInit) {
  return {
    request: new Request(url, init),
    cookies: {},
    url: new URL(url),
    redirect: (location: string) =>
      new Response(null, {
        status: 302,
        headers: {
          Location: location,
        },
      }),
  } as never;
}

describe("password recovery contract", () => {
  beforeEach(async () => {
    const { createClient } = await import("@/lib/supabase");
    vi.mocked(createClient).mockReset();
  });

  it("builds the hosted update-password redirect target for reset emails", () => {
    expect(buildAuthConfirmRedirect()).toBe("/auth/confirm?next=%2Fauth%2Fupdate-password");
    expect(sanitizeRecoveryNext("/dashboard")).toBe("/dashboard");
    expect(sanitizeRecoveryNext("https://evil.example")).toBe(UPDATE_PASSWORD_ROUTE);
  });

  it("keeps recovery errors on a recovery-specific error redirect", () => {
    expect(buildRecoveryErrorRedirect("broken link")).toBe("/auth/update-password?error=broken%20link");
  });

  it("sends reset emails back to the dedicated update-password route", async () => {
    const { createClient } = await import("@/lib/supabase");
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(createClient).mockReturnValue({
      auth: {
        resetPasswordForEmail,
      },
    } as never);

    const response = await resetPasswordPost(
      createRouteContext("http://localhost:4325/api/auth/reset-password", {
        method: "POST",
        body: new URLSearchParams({ email: "student@example.com" }),
      }),
    );

    expect(resetPasswordForEmail).toHaveBeenCalledWith("student@example.com", {
      redirectTo: `http://localhost:4325${AUTH_CONFIRM_ROUTE}`,
    });
    expect(response.headers.get("Location")).toBe("/auth/reset-password?sent=1");
  });

  it("verifies a token-hash recovery link and redirects into the update-password flow", async () => {
    const { createClient } = await import("@/lib/supabase");
    const verifyOtp = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(createClient).mockReturnValue({
      auth: {
        verifyOtp,
      },
    } as never);

    const response = await authConfirmGet(
      createRouteContext("http://localhost:4325/auth/confirm?token_hash=otp123&type=recovery&next=/dashboard"),
    );

    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: "otp123",
      type: "recovery",
    });
    expect(response.headers.get("Location")).toBe("http://localhost:4325/auth/update-password?recovery=ready");
  });

  it("rejects invalid confirm links with a recovery-specific error redirect", async () => {
    const { createClient } = await import("@/lib/supabase");
    vi.mocked(createClient).mockReturnValue({
      auth: {
        verifyOtp: vi.fn(),
      },
    } as never);

    const response = await authConfirmGet(createRouteContext("http://localhost:4325/auth/confirm?next=/dashboard"));

    expect(response.headers.get("Location")).toContain("/auth/update-password?error=");
  });

  it("builds the ready redirect inside the dedicated update-password flow", () => {
    expect(buildRecoveryReadyRedirect()).toBe("/auth/update-password?recovery=ready");
  });

  it("rejects mismatched password confirmation before attempting updateUser", async () => {
    const { createClient } = await import("@/lib/supabase");
    const updateUser = vi.fn();

    vi.mocked(createClient).mockReturnValue({
      auth: {
        updateUser,
      },
    } as never);

    const response = await updatePasswordPost(
      createRouteContext("http://localhost:4325/api/auth/update-password", {
        method: "POST",
        body: new URLSearchParams({
          password: "new-password",
          confirmation: "different-password",
        }),
      }),
    );

    expect(updateUser).not.toHaveBeenCalled();
    expect(response.headers.get("Location")).toBe("/auth/update-password?error=Passwords%20do%20not%20match.");
  });

  it("updates the password and redirects into the dashboard when recovery is complete", async () => {
    const { createClient } = await import("@/lib/supabase");
    const updateUser = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(createClient).mockReturnValue({
      auth: {
        updateUser,
      },
    } as never);

    const response = await updatePasswordPost(
      createRouteContext("http://localhost:4325/api/auth/update-password", {
        method: "POST",
        body: new URLSearchParams({
          password: "new-password",
          confirmation: "new-password",
        }),
      }),
    );

    expect(updateUser).toHaveBeenCalledWith({
      password: "new-password",
    });
    expect(response.headers.get("Location")).toBe("/dashboard?passwordUpdated=1");
  });

  it("maps password-reuse provider failures to app-owned recovery guidance", async () => {
    const { createClient } = await import("@/lib/supabase");
    const updateUser = vi.fn().mockResolvedValue({
      error: {
        message: "New password should be different from the old password.",
      },
    });

    vi.mocked(createClient).mockReturnValue({
      auth: {
        updateUser,
      },
    } as never);

    const response = await updatePasswordPost(
      createRouteContext("http://localhost:4325/api/auth/update-password", {
        method: "POST",
        body: new URLSearchParams({
          password: "old-password",
          confirmation: "old-password",
        }),
      }),
    );

    expect(response.headers.get("Location")).toBe(
      "/auth/update-password?error=Choose%20a%20password%20different%20from%20the%20current%20one.",
    );
  });

  it("keeps unknown provider failures on the generic recovery error path", async () => {
    const { createClient } = await import("@/lib/supabase");
    const updateUser = vi.fn().mockResolvedValue({
      error: {
        message: "unexpected auth failure",
      },
    });

    vi.mocked(createClient).mockReturnValue({
      auth: {
        updateUser,
      },
    } as never);

    const response = await updatePasswordPost(
      createRouteContext("http://localhost:4325/api/auth/update-password", {
        method: "POST",
        body: new URLSearchParams({
          password: "new-password",
          confirmation: "new-password",
        }),
      }),
    );

    expect(response.headers.get("Location")).toBe("/auth/update-password?error=unexpected%20auth%20failure");
  });
});
