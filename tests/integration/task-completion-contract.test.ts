import { describe, expect, it } from "vitest";

import { setTaskCompletion } from "@/lib/supervision";
import { createSupabaseStub } from "./support/supabaseStub";

describe("task completion contract", () => {
  it("completes and reopens a durable task item without changing its identity or position", async () => {
    const supabase = createSupabaseStub({
      note_items: [
        {
          id: "task-1",
          note_id: "note-1",
          position: 2,
          item_type: "task",
          content: "Prepare the follow-up summary",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-05T09:00:00Z",
          updated_at: "2026-06-05T09:00:00Z",
        },
      ],
    });

    const completedItem = await setTaskCompletion(supabase as never, {
      note_id: "note-1",
      note_item_id: "task-1",
      completed_by: "student-1",
      state: "complete",
    });

    expect(completedItem.id).toBe("task-1");
    expect(completedItem.note_id).toBe("note-1");
    expect(completedItem.position).toBe(2);
    expect(completedItem.item_type).toBe("task");
    expect(completedItem.content).toBe("Prepare the follow-up summary");
    expect(completedItem.completed_by).toBe("student-1");
    expect(completedItem.completed_at).not.toBeNull();

    const reopenedItem = await setTaskCompletion(supabase as never, {
      note_id: "note-1",
      note_item_id: "task-1",
      completed_by: "prof-1",
      state: "incomplete",
    });

    expect(reopenedItem.id).toBe("task-1");
    expect(reopenedItem.position).toBe(2);
    expect(reopenedItem.completed_at).toBeNull();
    expect(reopenedItem.completed_by).toBeNull();
  });

  it("rejects completion attempts for info items", async () => {
    const supabase = createSupabaseStub({
      note_items: [
        {
          id: "info-1",
          note_id: "note-1",
          position: 1,
          item_type: "info",
          content: "Context only",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-05T09:00:00Z",
          updated_at: "2026-06-05T09:00:00Z",
        },
      ],
    });

    await expect(
      setTaskCompletion(supabase as never, {
        note_id: "note-1",
        note_item_id: "info-1",
        completed_by: "student-1",
        state: "complete",
      }),
    ).rejects.toThrow("Only task items can change completion state.");
  });

  it("rejects completion attempts for inaccessible note items", async () => {
    const supabase = createSupabaseStub({
      note_items: [
        {
          id: "task-1",
          note_id: "note-1",
          position: 2,
          item_type: "task",
          content: "Prepare the follow-up summary",
          completed_at: null,
          completed_by: null,
          created_at: "2026-06-05T09:00:00Z",
          updated_at: "2026-06-05T09:00:00Z",
        },
      ],
    });

    await expect(
      setTaskCompletion(supabase as never, {
        note_id: "note-1",
        note_item_id: "foreign-task",
        completed_by: "student-1",
        state: "complete",
      }),
    ).rejects.toThrow("The selected note item is not accessible.");
  });
});
