import { describe, expect, it } from "vitest";

import { updateStudentNote } from "@/lib/supervision";
import { createSupabaseStub } from "./support/supabaseStub";

describe("supervision shared note update contract", () => {
  it("preserves existing item ids, appends new items at the tail, and updates note continuity metadata", async () => {
    const supabase = createSupabaseStub({
      notes: [
        {
          id: "note-1",
          student_id: "student-1",
          meeting_date: "2026-06-03",
          created_by: "prof-1",
          updated_by: "prof-1",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      note_items: [
        {
          id: "item-1",
          note_id: "note-1",
          position: 1,
          item_type: "info",
          content: "Original context",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
        {
          id: "item-2",
          note_id: "note-1",
          position: 2,
          item_type: "task",
          content: "Original task",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
    });

    const updatedNote = await updateStudentNote(supabase as never, {
      note_id: "note-1",
      student_id: "student-1",
      meeting_date: "2026-06-03",
      created_by: "prof-1",
      updated_by: "student-1",
      existing_items: [
        {
          id: "item-1",
          item_type: "info",
          content: "Revised context",
        },
      ],
      new_items: [
        {
          item_type: "task",
          content: "Fresh follow-up item",
        },
      ],
    });

    expect(updatedNote.updated_by).toBe("student-1");
    expect(updatedNote.student_id).toBe("student-1");
    expect(updatedNote.meeting_date).toBe("2026-06-03");
    expect(updatedNote.created_by).toBe("prof-1");
    expect(updatedNote.items.map((item) => item.id)).toEqual(["item-1", "item-2", "stub-row-1"]);
    expect(updatedNote.items.map((item) => item.position)).toEqual([1, 2, 3]);
    expect(updatedNote.items[0]).toMatchObject({
      id: "item-1",
      item_type: "info",
      content: "Revised context",
    });
    expect(updatedNote.items[1]).toMatchObject({
      id: "item-2",
      position: 2,
      content: "Original task",
    });
    expect(updatedNote.items[2]).toMatchObject({
      note_id: "note-1",
      position: 3,
      item_type: "task",
      content: "Fresh follow-up item",
    });
  });

  it("rejects immutable field drift before mutating the note", async () => {
    const supabase = createSupabaseStub({
      notes: [
        {
          id: "note-1",
          student_id: "student-1",
          meeting_date: "2026-06-03",
          created_by: "prof-1",
          updated_by: "prof-1",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      note_items: [],
    });

    await expect(
      updateStudentNote(supabase as never, {
        note_id: "note-1",
        student_id: "student-1",
        meeting_date: "2026-06-04",
        created_by: "prof-1",
        updated_by: "student-1",
        existing_items: [],
        new_items: [],
      }),
    ).rejects.toThrow("Meeting date cannot be changed for an existing note.");
  });

  it("rejects attempts to update note items outside the current note", async () => {
    const supabase = createSupabaseStub({
      notes: [
        {
          id: "note-1",
          student_id: "student-1",
          meeting_date: "2026-06-03",
          created_by: "prof-1",
          updated_by: "prof-1",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      note_items: [
        {
          id: "item-1",
          note_id: "note-1",
          position: 1,
          item_type: "info",
          content: "Original context",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
    });

    await expect(
      updateStudentNote(supabase as never, {
        note_id: "note-1",
        student_id: "student-1",
        meeting_date: "2026-06-03",
        created_by: "prof-1",
        updated_by: "student-1",
        existing_items: [
          {
            id: "foreign-item",
            item_type: "task",
            content: "Should fail",
          },
        ],
        new_items: [],
      }),
    ).rejects.toThrow("The selected note item is not accessible.");
  });

  it("rejects updates for a note that is outside the current student scope", async () => {
    const supabase = createSupabaseStub({
      notes: [
        {
          id: "note-1",
          student_id: "other-student",
          meeting_date: "2026-06-03",
          created_by: "prof-1",
          updated_by: "prof-1",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      note_items: [],
    });

    await expect(
      updateStudentNote(supabase as never, {
        note_id: "note-1",
        student_id: "student-1",
        meeting_date: "2026-06-03",
        created_by: "prof-1",
        updated_by: "student-1",
        existing_items: [],
        new_items: [],
      }),
    ).rejects.toThrow("The selected note is not accessible.");
  });

  it("rejects a mixed update when any existing item id does not belong to the current note", async () => {
    const supabase = createSupabaseStub({
      notes: [
        {
          id: "note-1",
          student_id: "student-1",
          meeting_date: "2026-06-03",
          created_by: "prof-1",
          updated_by: "prof-1",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      note_items: [
        {
          id: "item-1",
          note_id: "note-1",
          position: 1,
          item_type: "info",
          content: "Original context",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
        {
          id: "item-2",
          note_id: "note-1",
          position: 2,
          item_type: "task",
          content: "Original task",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
    });

    await expect(
      updateStudentNote(supabase as never, {
        note_id: "note-1",
        student_id: "student-1",
        meeting_date: "2026-06-03",
        created_by: "prof-1",
        updated_by: "student-1",
        existing_items: [
          {
            id: "item-1",
            item_type: "info",
            content: "Allowed change",
          },
          {
            id: "foreign-item",
            item_type: "task",
            content: "Should still fail the whole update",
          },
        ],
        new_items: [],
      }),
    ).rejects.toThrow("The selected note item is not accessible.");

    expect(supabase.trace).not.toContainEqual(
      expect.objectContaining({
        table: "notes",
        method: "update",
      }),
    );
    expect(supabase.trace).not.toContainEqual(
      expect.objectContaining({
        table: "note_items",
        method: "update",
      }),
    );
  });

  it("updates existing items in place without appending when new_items is empty", async () => {
    const supabase = createSupabaseStub({
      notes: [
        {
          id: "note-1",
          student_id: "student-1",
          meeting_date: "2026-06-03",
          created_by: "prof-1",
          updated_by: "prof-1",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      note_items: [
        {
          id: "item-1",
          note_id: "note-1",
          position: 1,
          item_type: "info",
          content: "Original context",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
        {
          id: "item-2",
          note_id: "note-1",
          position: 2,
          item_type: "task",
          content: "Original task",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
    });

    const updatedNote = await updateStudentNote(supabase as never, {
      note_id: "note-1",
      student_id: "student-1",
      meeting_date: "2026-06-03",
      created_by: "prof-1",
      updated_by: "student-1",
      existing_items: [
        {
          id: "item-2",
          item_type: "task",
          content: "Revised task only",
        },
      ],
      new_items: [],
    });

    expect(updatedNote.items.map((item) => item.id)).toEqual(["item-1", "item-2"]);
    expect(updatedNote.items.map((item) => item.position)).toEqual([1, 2]);
    expect(updatedNote.items[0]).toMatchObject({
      id: "item-1",
      content: "Original context",
    });
    expect(updatedNote.items[1]).toMatchObject({
      id: "item-2",
      content: "Revised task only",
    });

    const noteItemInsertCalls = supabase.trace.filter(
      (entry) => entry.table === "note_items" && entry.method === "insert",
    );
    expect(noteItemInsertCalls).toHaveLength(0);
  });

  it("returns note items sorted by position even when the reload order is unstable", async () => {
    const supabase = createSupabaseStub({
      notes: [
        {
          id: "note-1",
          student_id: "student-1",
          meeting_date: "2026-06-03",
          created_by: "prof-1",
          updated_by: "prof-1",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      note_items: {
        ignoreOrder: true,
        rows: [
          {
            id: "item-2",
            note_id: "note-1",
            position: 2,
            item_type: "task",
            content: "Second item comes first in storage order",
            completed_at: null,
            completed_by: null,
            created_at: "2026-06-03T09:00:00Z",
            updated_at: "2026-06-03T09:00:00Z",
          },
          {
            id: "item-1",
            note_id: "note-1",
            position: 1,
            item_type: "info",
            content: "First item comes second in storage order",
            completed_at: null,
            completed_by: null,
            created_at: "2026-06-03T09:00:00Z",
            updated_at: "2026-06-03T09:00:00Z",
          },
        ],
      },
    });

    const updatedNote = await updateStudentNote(supabase as never, {
      note_id: "note-1",
      student_id: "student-1",
      meeting_date: "2026-06-03",
      created_by: "prof-1",
      updated_by: "student-1",
      existing_items: [
        {
          id: "item-2",
          item_type: "task",
          content: "Updated second item",
        },
      ],
      new_items: [],
    });

    expect(updatedNote.items.map((item) => item.id)).toEqual(["item-1", "item-2"]);
    expect(updatedNote.items.map((item) => item.position)).toEqual([1, 2]);
    expect(updatedNote.items[1]).toMatchObject({
      id: "item-2",
      content: "Updated second item",
    });
  });

  it("surfaces note update persistence errors instead of continuing with a partial shared-note edit", async () => {
    const supabase = createSupabaseStub({
      notes: {
        operationErrors: {
          update: {
            code: "42501",
            message: "note update failed",
          },
        },
        rows: [
          {
            id: "note-1",
            student_id: "student-1",
            meeting_date: "2026-06-03",
            created_by: "prof-1",
            updated_by: "prof-1",
            created_at: "2026-06-03T09:00:00Z",
            updated_at: "2026-06-03T09:00:00Z",
          },
        ],
      },
      note_items: [
        {
          id: "item-1",
          note_id: "note-1",
          position: 1,
          item_type: "info",
          content: "Original context",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
    });

    await expect(
      updateStudentNote(supabase as never, {
        note_id: "note-1",
        student_id: "student-1",
        meeting_date: "2026-06-03",
        created_by: "prof-1",
        updated_by: "student-1",
        existing_items: [],
        new_items: [],
      }),
    ).rejects.toThrow("note update failed | code: 42501");
  });

  it("surfaces note lookup errors before any shared-note mutation starts", async () => {
    const supabase = createSupabaseStub({
      notes: {
        error: {
          code: "42501",
          message: "note lookup failed",
        },
        rows: [],
      },
      note_items: [],
    });

    await expect(
      updateStudentNote(supabase as never, {
        note_id: "note-1",
        student_id: "student-1",
        meeting_date: "2026-06-03",
        created_by: "prof-1",
        updated_by: "student-1",
        existing_items: [],
        new_items: [],
      }),
    ).rejects.toThrow("note lookup failed | code: 42501");

    expect(supabase.trace).not.toContainEqual(
      expect.objectContaining({
        table: "note_items",
        method: "update",
      }),
    );
  });

  it("surfaces note item reload errors before mutating any shared-note items", async () => {
    const supabase = createSupabaseStub({
      notes: [
        {
          id: "note-1",
          student_id: "student-1",
          meeting_date: "2026-06-03",
          created_by: "prof-1",
          updated_by: "prof-1",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      note_items: {
        error: {
          code: "42501",
          message: "note item load failed",
        },
        rows: [],
      },
    });

    await expect(
      updateStudentNote(supabase as never, {
        note_id: "note-1",
        student_id: "student-1",
        meeting_date: "2026-06-03",
        created_by: "prof-1",
        updated_by: "student-1",
        existing_items: [],
        new_items: [],
      }),
    ).rejects.toThrow("note item load failed | code: 42501");

    expect(supabase.trace).not.toContainEqual(
      expect.objectContaining({
        table: "notes",
        method: "update",
      }),
    );
  });

  it("surfaces note item update errors instead of silently accepting a broken shared-note edit", async () => {
    const supabase = createSupabaseStub({
      notes: [
        {
          id: "note-1",
          student_id: "student-1",
          meeting_date: "2026-06-03",
          created_by: "prof-1",
          updated_by: "prof-1",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      note_items: {
        operationErrors: {
          update: {
            code: "23514",
            message: "note item update failed",
          },
        },
        rows: [
          {
            id: "item-1",
            note_id: "note-1",
            position: 1,
            item_type: "info",
            content: "Original context",
            completed_at: null,
            completed_by: null,
            created_at: "2026-06-03T09:00:00Z",
            updated_at: "2026-06-03T09:00:00Z",
          },
        ],
      },
    });

    await expect(
      updateStudentNote(supabase as never, {
        note_id: "note-1",
        student_id: "student-1",
        meeting_date: "2026-06-03",
        created_by: "prof-1",
        updated_by: "student-1",
        existing_items: [
          {
            id: "item-1",
            item_type: "info",
            content: "Revised context",
          },
        ],
        new_items: [],
      }),
    ).rejects.toThrow("note item update failed | code: 23514");
  });

  it("surfaces append errors instead of returning a partially grown shared note", async () => {
    const supabase = createSupabaseStub({
      notes: [
        {
          id: "note-1",
          student_id: "student-1",
          meeting_date: "2026-06-03",
          created_by: "prof-1",
          updated_by: "prof-1",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      note_items: {
        operationErrors: {
          insert: {
            code: "23505",
            message: "append failed",
          },
        },
        rows: [
          {
            id: "item-1",
            note_id: "note-1",
            position: 1,
            item_type: "info",
            content: "Original context",
            completed_at: null,
            completed_by: null,
            created_at: "2026-06-03T09:00:00Z",
            updated_at: "2026-06-03T09:00:00Z",
          },
        ],
      },
    });

    await expect(
      updateStudentNote(supabase as never, {
        note_id: "note-1",
        student_id: "student-1",
        meeting_date: "2026-06-03",
        created_by: "prof-1",
        updated_by: "student-1",
        existing_items: [],
        new_items: [
          {
            item_type: "task",
            content: "Fresh follow-up item",
          },
        ],
      }),
    ).rejects.toThrow("append failed | code: 23505");
  });

  it("appends new shared-note items after the highest existing position even when earlier positions are sparse", async () => {
    const supabase = createSupabaseStub({
      notes: [
        {
          id: "note-1",
          student_id: "student-1",
          meeting_date: "2026-06-03",
          created_by: "prof-1",
          updated_by: "prof-1",
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
      note_items: [
        {
          id: "item-1",
          note_id: "note-1",
          position: 2,
          item_type: "info",
          content: "Existing sparse item",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
        {
          id: "item-2",
          note_id: "note-1",
          position: 5,
          item_type: "task",
          content: "Tail item",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-03T09:00:00Z",
          updated_at: "2026-06-03T09:00:00Z",
        },
      ],
    });

    const updatedNote = await updateStudentNote(supabase as never, {
      note_id: "note-1",
      student_id: "student-1",
      meeting_date: "2026-06-03",
      created_by: "prof-1",
      updated_by: "student-1",
      existing_items: [],
      new_items: [
        {
          item_type: "task",
          content: "Append one",
        },
        {
          item_type: "info",
          content: "Append two",
        },
      ],
    });

    expect(updatedNote.items.map((item) => item.position)).toEqual([2, 5, 6, 7]);
    expect(updatedNote.items.slice(0, 2).map((item) => item.id)).toEqual(["item-1", "item-2"]);
    expect(updatedNote.items[2]).toMatchObject({
      content: "Append one",
      position: 6,
    });
    expect(updatedNote.items[3]).toMatchObject({
      content: "Append two",
      position: 7,
    });
  });
});
