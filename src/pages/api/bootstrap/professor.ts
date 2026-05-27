import type { APIRoute } from "astro";

import { claimProfessorRoleForUser } from "@/lib/profile";
import { createClient } from "@/lib/supabase";

export const GET: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/auth/signin?error=${encodeURIComponent("Supabase is not configured")}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return context.redirect("/auth/signin");
  }

  try {
    const result = await claimProfessorRoleForUser(user);

    if (!result.claimed) {
      return context.redirect(
        `/auth/signin?error=${encodeURIComponent("Professor bootstrap is not available for this account")}`,
      );
    }

    return context.redirect("/dashboard");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Professor bootstrap failed";
    return context.redirect(`/auth/signin?error=${encodeURIComponent(message)}`);
  }
};
