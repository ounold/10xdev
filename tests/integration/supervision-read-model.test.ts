import { describe, expect, it } from "vitest";

import { getLinkedStudentHistoryForUser, getStudentHistory } from "@/lib/supervision";
import { createSupabaseStub } from "./support/supabaseStub";

describe("supervision read model continuity", () => {
  it("returns notes newest-first and preserves note item ordering and semantics", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-1",
          professor_profile_id: "prof-1",
          student_profile_id: "linked-user-1",
          full_name: "Seed Student",
          email: "seed-student@example.com",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      notes: [
        {
          id: "note-older",
          student_id: "student-1",
          meeting_date: "2026-05-30",
          created_by: "prof-1",
          updated_by: "prof-1",
          created_at: "2026-05-30T08:00:00Z",
          updated_at: "2026-05-30T08:00:00Z",
        },
        {
          id: "note-same-date-earlier",
          student_id: "student-1",
          meeting_date: "2026-06-01",
          created_by: "prof-1",
          updated_by: "prof-1",
          created_at: "2026-06-01T09:00:00Z",
          updated_at: "2026-06-01T09:00:00Z",
        },
        {
          id: "note-same-date-later",
          student_id: "student-1",
          meeting_date: "2026-06-01",
          created_by: "prof-1",
          updated_by: "prof-1",
          created_at: "2026-06-01T11:00:00Z",
          updated_at: "2026-06-01T11:00:00Z",
        },
      ],
      note_items: [
        {
          id: "item-b",
          note_id: "note-same-date-later",
          position: 2,
          item_type: "task",
          content: "Prepare the follow-up summary",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-01T11:00:00Z",
          updated_at: "2026-06-01T11:00:00Z",
        },
        {
          id: "item-a",
          note_id: "note-same-date-later",
          position: 1,
          item_type: "info",
          content: "Discussed the latest milestone",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-01T11:00:00Z",
          updated_at: "2026-06-01T11:00:00Z",
        },
        {
          id: "item-c",
          note_id: "note-same-date-earlier",
          position: 1,
          item_type: "task",
          content: "Share the draft experiment plan",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-01T09:00:00Z",
          updated_at: "2026-06-01T09:00:00Z",
        },
      ],
    });

    const history = await getStudentHistory(supabase as never, "student-1");

    expect(history).not.toBeNull();
    expect(history?.notes.map((note) => note.id)).toEqual([
      "note-same-date-later",
      "note-same-date-earlier",
      "note-older",
    ]);
    expect(history?.notes[0]?.items.map((item) => item.position)).toEqual([1, 2]);
    expect(history?.notes[0]?.items.map((item) => item.item_type)).toEqual(["info", "task"]);
  });

  it("returns null when a linked student record cannot be found", async () => {
    const supabase = createSupabaseStub({
      students: [],
      notes: [],
      note_items: [],
    });

    await expect(getLinkedStudentHistoryForUser(supabase as never, "missing-user")).resolves.toBeNull();
  });

  it("loads the linked student's history through the shared read model", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-1",
          professor_profile_id: "prof-1",
          student_profile_id: "linked-user-1",
          full_name: "Linked Student",
          email: "linked-student@example.com",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      notes: [
        {
          id: "note-1",
          student_id: "student-1",
          meeting_date: "2026-06-02",
          created_by: "prof-1",
          updated_by: "prof-1",
          created_at: "2026-06-02T10:00:00Z",
          updated_at: "2026-06-02T10:00:00Z",
        },
      ],
      note_items: [
        {
          id: "item-1",
          note_id: "note-1",
          position: 1,
          item_type: "info",
          content: "Confirmed the supervision thread is visible to the linked student.",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-02T10:00:00Z",
          updated_at: "2026-06-02T10:00:00Z",
        },
      ],
    });

    const history = await getLinkedStudentHistoryForUser(supabase as never, "linked-user-1");

    expect(history).not.toBeNull();
    expect(history?.id).toBe("student-1");
    expect(history?.notes).toHaveLength(1);
    expect(history?.notes[0]?.id).toBe("note-1");
    expect(history?.notes[0]?.items.map((item) => item.content)).toEqual([
      "Confirmed the supervision thread is visible to the linked student.",
    ]);
  });

  it("returns an empty item list when a note has no note_items rows", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-1",
          professor_profile_id: "prof-1",
          student_profile_id: "linked-user-1",
          full_name: "Student Without Items",
          email: "student-without-items@example.com",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      notes: [
        {
          id: "note-without-items",
          student_id: "student-1",
          meeting_date: "2026-06-02",
          created_by: "prof-1",
          updated_by: "prof-1",
          created_at: "2026-06-02T10:00:00Z",
          updated_at: "2026-06-02T10:00:00Z",
        },
      ],
      note_items: [],
    });

    const history = await getStudentHistory(supabase as never, "student-1");

    expect(history).not.toBeNull();
    expect(history?.notes[0]?.items).toEqual([]);
  });

  it("surfaces student lookup errors instead of silently returning null", async () => {
    const supabase = createSupabaseStub({
      students: {
        error: {
          code: "42501",
          message: "student lookup failed",
        },
        rows: [],
      },
      notes: [],
      note_items: [],
    });

    await expect(getStudentHistory(supabase as never, "student-1")).rejects.toThrow(
      "student lookup failed | code: 42501",
    );
  });

  it("surfaces notes lookup errors instead of returning partial history", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-1",
          professor_profile_id: "prof-1",
          student_profile_id: "linked-user-1",
          full_name: "Seed Student",
          email: "seed-student@example.com",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      notes: {
        error: {
          code: "42P01",
          message: "notes lookup failed",
        },
        rows: [],
      },
      note_items: [],
    });

    await expect(getStudentHistory(supabase as never, "student-1")).rejects.toThrow(
      "notes lookup failed | code: 42P01",
    );
  });
});
