import type { APIRoute } from "astro";

import { normalizeSubmittedNoteItems, splitSubmittedNoteItems } from "@/lib/note-items-payload";
import { createStudentNote, getStudentHistory, updateStudentNote } from "@/lib/supervision";
import { createAdminClient, createClient } from "@/lib/supabase";

function redirectToStudentThread(studentId: string, query: URLSearchParams) {
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return `/dashboard/students/${studentId}${suffix}`;
}

export const POST: APIRoute = async (context) => {
  const studentId = context.params.studentId;
  if (!studentId) {
    return context.redirect("/dashboard");
  }

  const formData = await context.request.formData();
  const noteIdEntry = formData.get("noteId");
  const noteId = typeof noteIdEntry === "string" && noteIdEntry.length > 0 ? noteIdEntry : null;
  const rawMeetingDate = formData.get("meetingDate");
  const meetingDate = typeof rawMeetingDate === "string" ? rawMeetingDate.trim() : "";
  const query = new URLSearchParams();

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    query.set("error", "Supabase is not configured");
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
    query.set("error", "This student thread is not available to the current professor.");
    return context.redirect(redirectToStudentThread(studentId, query));
  }

  const items = normalizeSubmittedNoteItems(formData.get("itemsPayload"));
  const adminClient = createAdminClient();

  if (!meetingDate) {
    query.set("error", "Meeting date is required.");
    return context.redirect(redirectToStudentThread(studentId, query));
  }

  if (items.length === 0) {
    query.set("error", "Add at least one note item before saving.");
    return context.redirect(redirectToStudentThread(studentId, query));
  }

  if (!adminClient) {
    query.set("error", "Supabase admin client is not configured for note writes.");
    return context.redirect(redirectToStudentThread(studentId, query));
  }

  try {
    if (noteId) {
      const targetNote = accessibleStudent.notes.find((note) => note.id === noteId);
      if (!targetNote) {
        query.set("error", "The selected note is not available in this thread.");
        return context.redirect(redirectToStudentThread(studentId, query));
      }

      const { existing_items, new_items } = splitSubmittedNoteItems(items);
      await updateStudentNote(adminClient, {
        note_id: noteId,
        student_id: studentId,
        meeting_date: targetNote.meeting_date,
        created_by: targetNote.created_by,
        updated_by: user.id,
        existing_items,
        new_items,
      });
    } else {
      await createStudentNote(adminClient, {
        student_id: studentId,
        meeting_date: meetingDate,
        created_by: user.id,
        updated_by: user.id,
        items,
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      query.set("error", error.message);
    } else if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
      query.set("error", error.message);
    } else {
      query.set("error", "Unable to save the note right now.");
    }
    return context.redirect(redirectToStudentThread(studentId, query));
  }

  query.set(noteId ? "updated" : "saved", "1");
  return context.redirect(redirectToStudentThread(studentId, query));
};
