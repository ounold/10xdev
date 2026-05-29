import type { APIRoute } from "astro";

import { createProfessorStudent } from "@/lib/supervision";
import { createClient } from "@/lib/supabase";

function redirectToDashboard(query: URLSearchParams) {
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return `/dashboard${suffix}`;
}

export const POST: APIRoute = async (context) => {
  const query = new URLSearchParams();
  const supabase = createClient(context.request.headers, context.cookies);

  if (!supabase) {
    query.set("creationError", "Supabase is not configured.");
    return context.redirect(redirectToDashboard(query));
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return context.redirect("/auth/signin");
  }

  if (context.locals.role !== "professor") {
    return context.redirect("/pending-access");
  }

  const formData = await context.request.formData();
  const rawFullName = formData.get("fullName");
  const rawEmail = formData.get("email");

  const fullName = typeof rawFullName === "string" ? rawFullName.trim() : "";
  const email = typeof rawEmail === "string" ? rawEmail.trim() : "";

  if (!fullName) {
    query.set("creationError", "Student full name is required.");
    return context.redirect(redirectToDashboard(query));
  }

  try {
    await createProfessorStudent(supabase, {
      professor_profile_id: user.id,
      full_name: fullName,
      email: email.length > 0 ? email : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create the student right now.";
    query.set("creationError", message);
    return context.redirect(redirectToDashboard(query));
  }

  query.set("creationReady", "1");
  return context.redirect(redirectToDashboard(query));
};
