import type { APIRoute } from "astro";

import { getStudentHistory, setTaskCompletion } from "@/lib/supervision";
import { createAdminClient, createClient } from "@/lib/supabase";

function redirectToStudentThread(studentId: string, query: URLSearchParams, editNoteId?: string | null) {
  if (editNoteId) {
    query.set("edit", editNoteId);
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return `/dashboard/students/${studentId}${suffix}`;
}

function toTaskCompletionState(value: FormDataEntryValue | null) {
  return value === "complete" || value === "incomplete" ? value : null;
}

export const POST: APIRoute = async (context) => {
  const studentId = context.params.studentId;
  const noteId = context.params.noteId;
  const itemId = context.params.itemId;
  const query = new URLSearchParams();

  if (!studentId || !noteId || !itemId) {
    return context.redirect("/dashboard");
  }

  const formData = await context.request.formData();
  const returnToEditValue = formData.get("returnToEdit");
  const returnToEdit = typeof returnToEditValue === "string" && returnToEditValue === noteId ? noteId : null;
  const desiredState = toTaskCompletionState(formData.get("state"));

  if (!desiredState) {
    query.set("error", "Choose a valid completion action for this task.");
    return context.redirect(redirectToStudentThread(studentId, query, returnToEdit));
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    query.set("error", "Supabase is not configured");
    return context.redirect(redirectToStudentThread(studentId, query, returnToEdit));
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
    query.set("error", "This student thread is not available to the current professor.");
    return context.redirect(redirectToStudentThread(studentId, query, returnToEdit));
  }

  const targetNote = accessibleStudent.notes.find((note) => note.id === noteId);
  if (!targetNote) {
    query.set("error", "The selected note is not available in this thread.");
    return context.redirect(redirectToStudentThread(studentId, query, returnToEdit));
  }

  const targetItem = targetNote.items.find((item) => item.id === itemId);
  if (!targetItem) {
    query.set("error", "The selected task is not available in this thread.");
    return context.redirect(redirectToStudentThread(studentId, query, returnToEdit));
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    query.set("error", "Supabase admin client is not configured for task completion writes.");
    return context.redirect(redirectToStudentThread(studentId, query, returnToEdit));
  }

  try {
    await setTaskCompletion(adminClient, {
      note_id: noteId,
      note_item_id: itemId,
      completed_by: user.id,
      state: desiredState,
    });
  } catch (error) {
    if (error instanceof Error) {
      query.set("error", error.message);
    } else if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      query.set("error", error.message);
    } else {
      query.set("error", "Unable to update task completion right now.");
    }

    return context.redirect(redirectToStudentThread(studentId, query, returnToEdit));
  }

  query.set("taskUpdated", desiredState);
  return context.redirect(redirectToStudentThread(studentId, query, returnToEdit));
};
