import type { APIRoute } from "astro";

import type { CreateNoteItemInput, NoteItemType } from "@/lib/database";
import { createStudentNote, getStudentHistory } from "@/lib/supervision";
import { createAdminClient, createClient } from "@/lib/supabase";

function redirectToStudentThread(studentId: string, query: URLSearchParams) {
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return `/dashboard/students/${studentId}${suffix}`;
}

function isNoteItemType(value: string): value is NoteItemType {
  return value === "info" || value === "task";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeItems(rawPayload: FormDataEntryValue | null): CreateNoteItemInput[] {
  if (typeof rawPayload !== "string" || rawPayload.length === 0) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawPayload);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((item): CreateNoteItemInput[] => {
    if (!isRecord(item)) {
      return [];
    }

    const itemType = typeof item.item_type === "string" ? item.item_type : "";
    const content = typeof item.content === "string" ? item.content.trim() : "";

    if (!isNoteItemType(itemType) || content.length === 0) {
      return [];
    }

    return [
      {
        item_type: itemType,
        content,
      },
    ];
  });
}

export const POST: APIRoute = async (context) => {
  const studentId = context.params.studentId;
  if (!studentId) {
    return context.redirect("/dashboard");
  }

  const formData = await context.request.formData();
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

  const items = normalizeItems(formData.get("itemsPayload"));
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
    await createStudentNote(adminClient, {
      student_id: studentId,
      meeting_date: meetingDate,
      created_by: user.id,
      updated_by: user.id,
      items,
    });
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

  query.set("saved", "1");
  return context.redirect(redirectToStudentThread(studentId, query));
};
