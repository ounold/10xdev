import type { EmailOtpType } from "@supabase/supabase-js";
import type { APIRoute } from "astro";
import { buildRecoveryErrorRedirect, sanitizeRecoveryNext, UPDATE_PASSWORD_ROUTE } from "@/lib/auth-recovery";
import { createClient } from "@/lib/supabase";

export const GET: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(buildRecoveryErrorRedirect("Supabase is not configured"));
  }

  const tokenHash = context.url.searchParams.get("token_hash");
  const rawType = context.url.searchParams.get("type");
  const type: EmailOtpType | null =
    rawType === "signup" ||
    rawType === "invite" ||
    rawType === "magiclink" ||
    rawType === "recovery" ||
    rawType === "email_change" ||
    rawType === "email"
      ? rawType
      : null;
  const next = sanitizeRecoveryNext(context.url.searchParams.get("next"));
  const redirectTo = new URL(context.url.toString());
  redirectTo.pathname = next;
  redirectTo.search = "";

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      redirectTo.pathname = UPDATE_PASSWORD_ROUTE;
      redirectTo.search = new URLSearchParams({ recovery: "ready" }).toString();
      return context.redirect(redirectTo.toString());
    }

    return context.redirect(buildRecoveryErrorRedirect(error.message));
  }

  return context.redirect(
    buildRecoveryErrorRedirect("This password recovery link is invalid or has expired. Request a new reset email."),
  );
};
