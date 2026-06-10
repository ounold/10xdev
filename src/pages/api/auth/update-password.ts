import type { APIRoute } from "astro";
import { buildRecoveryErrorRedirect } from "@/lib/auth-recovery";
import { createClient } from "@/lib/supabase";

const MIN_PASSWORD_LENGTH = 8;

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const password = form.get("password");
  const confirmation = form.get("confirmation");

  if (typeof password !== "string" || typeof confirmation !== "string") {
    return context.redirect(buildRecoveryErrorRedirect("Enter and confirm the new password."));
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return context.redirect(buildRecoveryErrorRedirect(`Use at least ${MIN_PASSWORD_LENGTH} characters.`));
  }

  if (password !== confirmation) {
    return context.redirect(buildRecoveryErrorRedirect("Passwords do not match."));
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(buildRecoveryErrorRedirect("Supabase is not configured"));
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return context.redirect(buildRecoveryErrorRedirect(error.message));
  }

  return context.redirect("/dashboard");
};
