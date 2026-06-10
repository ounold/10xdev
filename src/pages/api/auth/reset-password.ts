import type { APIRoute } from "astro";
import { AUTH_CONFIRM_ROUTE } from "@/lib/auth-recovery";
import { createClient } from "@/lib/supabase";

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = form.get("email") as string;

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/auth/reset-password?error=${encodeURIComponent("Supabase is not configured")}`);
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL(AUTH_CONFIRM_ROUTE, context.url.origin).toString(),
  });

  if (error) {
    return context.redirect(`/auth/reset-password?error=${encodeURIComponent(error.message)}`);
  }

  return context.redirect("/auth/reset-password?sent=1");
};
