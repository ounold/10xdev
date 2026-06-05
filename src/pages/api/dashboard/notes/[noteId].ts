import type { APIRoute } from "astro";

import { normalizeSubmittedNoteItems, splitSubmittedNoteItems } from "@/lib/note-items-payload";
import { getLinkedStudentHistoryForUser, updateStudentNote } from "@/lib/supervision";
import { createAdminClient, createClient } from "@/lib/supabase";

function redirectToDashboard(query: URLSearchParams) {
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return `/dashboard${suffix}`;
}

export const POST: APIRoute = async (context) => {
  const noteId = context.params.noteId;
  const query = new URLSearchParams();

  if (!noteId) {
    return context.redirect("/dashboard");
  }

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    query.set("error", "Supabase is not configured");
    return context.redirect(redirectToDashboard(query));
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return context.redirect("/auth/signin");
  }

  if (context.locals.role !== "student" || !context.locals.isLinkedStudent) {
    return context.redirect("/pending-access");
  }

  const linkedStudentHistory = await getLinkedStudentHistoryForUser(supabase, user.id);
  if (!linkedStudentHistory) {
    query.set("error", "Linked student history is not available for this account.");
    return context.redirect(redirectToDashboard(query));
  }

  const targetNote = linkedStudentHistory.notes.find((note) => note.id === noteId);
  if (!targetNote) {
    query.set("error", "The selected note is not available in your student history.");
    return context.redirect(redirectToDashboard(query));
  }

  const items = normalizeSubmittedNoteItems((await context.request.formData()).get("itemsPayload"));
  if (items.length === 0) {
    query.set("error", "Add at least one note item before saving.");
    query.set("edit", noteId);
    return context.redirect(redirectToDashboard(query));
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    query.set("error", "Supabase admin client is not configured for note writes.");
    query.set("edit", noteId);
    return context.redirect(redirectToDashboard(query));
  }

  try {
    const { existing_items, new_items } = splitSubmittedNoteItems(items);
    await updateStudentNote(adminClient, {
      note_id: noteId,
      student_id: linkedStudentHistory.id,
      meeting_date: targetNote.meeting_date,
      created_by: targetNote.created_by,
      updated_by: user.id,
      existing_items,
      new_items,
    });
  } catch (error) {
    if (error instanceof Error) {
      query.set("error", error.message);
    } else if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      query.set("error", error.message);
    } else {
      query.set("error", "Unable to save the note right now.");
    }
    query.set("edit", noteId);
    return context.redirect(redirectToDashboard(query));
  }

  query.set("updated", "1");
  return context.redirect(redirectToDashboard(query));
};
