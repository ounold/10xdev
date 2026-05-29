import type { APIRoute } from "astro";

import type { CreateStudentFormInput } from "@/lib/database";
import { createProfessorStudent } from "@/lib/supervision";
import { createAdminClient, createClient } from "@/lib/supabase";

function redirectToDashboard(query: URLSearchParams) {
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return `/dashboard${suffix}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
  const draft: CreateStudentFormInput = {
    full_name: typeof rawFullName === "string" ? rawFullName.trim() : "",
    email: typeof rawEmail === "string" ? rawEmail.trim() : "",
  };

  const { full_name: fullName, email } = draft;

  if (fullName) {
    query.set("draftFullName", fullName);
  }

  if (email) {
    query.set("draftEmail", email);
  }

  if (!fullName) {
    query.set("creationError", "Student full name is required.");
    return context.redirect(redirectToDashboard(query));
  }

  if (email.length > 0 && !isValidEmail(email)) {
    query.set("creationError", "Provide a valid email or leave the email field blank.");
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
    const isHostedRlsFailure = message.includes("code: 42501");

    if (!isHostedRlsFailure) {
      query.set("creationError", message);
      return context.redirect(redirectToDashboard(query));
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      query.set("creationError", message);
      return context.redirect(redirectToDashboard(query));
    }

    try {
      await createProfessorStudent(adminClient, {
        professor_profile_id: user.id,
        full_name: fullName,
        email: email.length > 0 ? email : null,
      });
    } catch (adminError) {
      const adminMessage = adminError instanceof Error ? adminError.message : "Unable to create the student right now.";
      query.set("creationError", adminMessage);
      return context.redirect(redirectToDashboard(query));
    }
  }

  query.delete("draftFullName");
  query.delete("draftEmail");
  query.set("creationReady", "1");
  query.set("createdStudent", fullName);
  return context.redirect(redirectToDashboard(query));
};
