import type { APIRoute } from "astro";

import { getStudentLinkClaimabilityForUser } from "@/lib/profile";
import { claimStudentLink } from "@/lib/supervision";
import { createAdminClient, createClient } from "@/lib/supabase";

function redirectToPendingAccess(query: URLSearchParams) {
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return `/pending-access${suffix}`;
}

export const POST: APIRoute = async (context) => {
  const query = new URLSearchParams();
  const supabase = createClient(context.request.headers, context.cookies);

  if (!supabase) {
    query.set("claimError", "Supabase is not configured.");
    return context.redirect(redirectToPendingAccess(query));
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return context.redirect("/auth/signin");
  }

  if (context.locals.role !== "student") {
    return context.redirect("/dashboard");
  }

  const claimability = await getStudentLinkClaimabilityForUser(user);
  if (claimability.status !== "claimable") {
    query.set("claimError", claimability.status);
    return context.redirect(redirectToPendingAccess(query));
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    query.set("claimError", "Student account linking is not configured.");
    return context.redirect(redirectToPendingAccess(query));
  }

  try {
    const result = await claimStudentLink(adminClient, {
      user_id: user.id,
      email: user.email ?? "",
    });

    if (result.status !== "claimable") {
      query.set("claimError", result.status);
      return context.redirect(redirectToPendingAccess(query));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to link the student account right now.";
    query.set("claimError", message);
    return context.redirect(redirectToPendingAccess(query));
  }

  return context.redirect("/dashboard?claimReady=1");
};
