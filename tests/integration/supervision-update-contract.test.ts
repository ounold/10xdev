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
});
