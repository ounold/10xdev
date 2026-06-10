import { describe, expect, it } from "vitest";

import {
  archiveProfessorStudent,
  getLinkedStudentHistoryForUser,
  getStudentHistory,
  listArchivedProfessorStudents,
  listProfessorStudents,
} from "@/lib/supervision";
import { createSupabaseStub } from "./support/supabaseStub";

describe("supervision read model continuity", () => {
  it("returns notes newest-first and preserves note item ordering and semantics", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-1",
          professor_profile_id: "prof-1",
          student_profile_id: "linked-user-1",
          archived_student_profile_id: null,
          lifecycle: "active",
          archived_at: null,
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
          archived_student_profile_id: null,
          lifecycle: "active",
          archived_at: null,
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
          archived_student_profile_id: null,
          lifecycle: "active",
          archived_at: null,
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
          archived_student_profile_id: null,
          lifecycle: "active",
          archived_at: null,
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

  it("returns null when the only matching linked row is archived", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-archived",
          professor_profile_id: "prof-1",
          student_profile_id: "linked-user-1",
          archived_student_profile_id: "linked-user-1",
          lifecycle: "archived",
          archived_at: "2026-06-09T11:00:00Z",
          full_name: "Archived Linked Student",
          email: "archived@example.com",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-09T11:00:00Z",
        },
      ],
      notes: [],
      note_items: [],
    });

    await expect(getLinkedStudentHistoryForUser(supabase as never, "linked-user-1")).resolves.toBeNull();
  });

  it("keeps archived rows out of the active professor roster helper", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-active",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          archived_student_profile_id: null,
          lifecycle: "active",
          archived_at: null,
          full_name: "Active Student",
          email: "active@example.com",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
        {
          id: "student-archived",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          archived_student_profile_id: "old-user",
          lifecycle: "archived",
          archived_at: "2026-06-09T11:00:00Z",
          full_name: "Archived Student",
          email: "archived@example.com",
          created_at: "2026-06-01T09:00:00Z",
          updated_at: "2026-06-09T11:00:00Z",
        },
      ],
      notes: [],
      note_items: [],
    });

    const roster = await listProfessorStudents(supabase as never);

    expect(roster.map((student) => student.id)).toEqual(["student-active"]);
  });

  it("exposes archived rows through the professor archived-roster helper", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-active",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          archived_student_profile_id: null,
          lifecycle: "active",
          archived_at: null,
          full_name: "Active Student",
          email: "active@example.com",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
        {
          id: "student-archived",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          archived_student_profile_id: "old-user",
          lifecycle: "archived",
          archived_at: "2026-06-09T11:00:00Z",
          full_name: "Archived Student",
          email: "archived@example.com",
          created_at: "2026-06-01T09:00:00Z",
          updated_at: "2026-06-09T11:00:00Z",
        },
      ],
      notes: [],
      note_items: [],
    });

    const roster = await listArchivedProfessorStudents(supabase as never);

    expect(roster.map((student) => student.id)).toEqual(["student-archived"]);
  });

  it("archives a linked active student and moves the row from active to archived roster helpers", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-linked",
          professor_profile_id: "prof-1",
          student_profile_id: "student-user-1",
          archived_student_profile_id: null,
          lifecycle: "active",
          archived_at: null,
          full_name: "Linked Student",
          email: "linked@example.com",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      notes: [],
      note_items: [],
    });

    const archivedStudent = await archiveProfessorStudent(supabase as never, {
      student_id: "student-linked",
    });

    expect(archivedStudent).toEqual(
      expect.objectContaining({
        id: "student-linked",
        lifecycle: "archived",
        student_profile_id: null,
        archived_student_profile_id: "student-user-1",
        archived_from_student_profile_id: "student-user-1",
      }),
    );
    expect(archivedStudent.archived_at).not.toBeNull();

    const activeRoster = await listProfessorStudents(supabase as never);
    const archivedRoster = await listArchivedProfessorStudents(supabase as never);

    expect(activeRoster).toEqual([]);
    expect(archivedRoster).toEqual([
      expect.objectContaining({
        id: "student-linked",
        lifecycle: "archived",
        archived_student_profile_id: "student-user-1",
      }),
    ]);
  });

  it("rejects archiving an active prepared student until the archive contract supports unlinked history", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-prepared",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          archived_student_profile_id: null,
          lifecycle: "active",
          archived_at: null,
          full_name: "Prepared Student",
          email: "prepared@example.com",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      notes: [],
      note_items: [],
    });

    await expect(
      archiveProfessorStudent(supabase as never, {
        student_id: "student-prepared",
      }),
    ).rejects.toThrow("Only linked active students can be archived with the current archive contract.");
  });

  it("fails clearly when the selected student cannot be archived", async () => {
    const supabase = createSupabaseStub({
      students: [],
      notes: [],
      note_items: [],
    });

    await expect(
      archiveProfessorStudent(supabase as never, {
        student_id: "missing-student",
      }),
    ).rejects.toThrow("The selected student is not accessible.");
  });
});
