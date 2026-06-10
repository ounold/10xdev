import type { APIRoute } from "astro";

import { archiveProfessorStudent, getStudentHistory } from "@/lib/supervision";
import { createAdminClient, createClient } from "@/lib/supabase";

function redirectToStudentThread(studentId: string, query: URLSearchParams) {
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return `/dashboard/students/${studentId}${suffix}`;
}

function redirectToDashboard(query: URLSearchParams) {
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return `/dashboard${suffix}`;
}

export const POST: APIRoute = async (context) => {
  const studentId = context.params.studentId;
  if (!studentId) {
    return context.redirect("/dashboard");
  }

  const query = new URLSearchParams();
  const formData = await context.request.formData();
  const confirmed = formData.get("confirmArchive");

  if (confirmed !== "yes") {
    query.set("archiveError", "Confirm the archive action before continuing.");
    return context.redirect(redirectToStudentThread(studentId, query));
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    query.set("archiveError", "Supabase is not configured.");
    return context.redirect(redirectToStudentThread(studentId, query));
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

  const accessibleStudent = await getStudentHistory(supabase, studentId);
  if (!accessibleStudent) {
    query.set("archiveError", "This student thread is not available to the current professor.");
    return context.redirect(redirectToStudentThread(studentId, query));
  }

  try {
    await archiveProfessorStudent(supabase, {
      student_id: studentId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to archive the selected student right now.";
    const isHostedRlsFailure = message.includes("code: 42501");

    if (!isHostedRlsFailure) {
      query.set("archiveError", message);
      return context.redirect(redirectToStudentThread(studentId, query));
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      query.set("archiveError", message);
      return context.redirect(redirectToStudentThread(studentId, query));
    }

    try {
      await archiveProfessorStudent(adminClient, {
        student_id: studentId,
      });
    } catch (adminError) {
      const adminMessage =
        adminError instanceof Error ? adminError.message : "Unable to archive the selected student right now.";
      query.set("archiveError", adminMessage);
      return context.redirect(redirectToStudentThread(studentId, query));
    }
  }

  query.set("archived", "1");
  query.set("archivedStudent", accessibleStudent.full_name);
  return context.redirect(redirectToDashboard(query));
};
