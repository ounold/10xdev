import { describe, expect, it } from "vitest";

import { normalizeSubmittedNoteItems, splitSubmittedNoteItems } from "@/lib/note-items-payload";

describe("note items payload helpers", () => {
  it("keeps existing item ids for edit payloads and splits new items for append-only updates", () => {
    const items = normalizeSubmittedNoteItems(
      JSON.stringify([
        {
          id: "item-1",
          item_type: "info",
          content: " Revised context ",
        },
        {
          item_type: "task",
          content: " Fresh follow-up ",
        },
      ]),
    );

    expect(items).toEqual([
      {
        id: "item-1",
        item_type: "info",
        content: "Revised context",
      },
      {
        id: undefined,
        item_type: "task",
        content: "Fresh follow-up",
      },
    ]);

    expect(splitSubmittedNoteItems(items)).toEqual({
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
          content: "Fresh follow-up",
        },
      ],
    });
  });

  it("keeps create payloads compatible by returning only new items when no ids are present", () => {
    const items = normalizeSubmittedNoteItems(
      JSON.stringify([
        {
          item_type: "info",
          content: "First bullet",
        },
        {
          item_type: "task",
          content: "Second bullet",
        },
      ]),
    );

    expect(splitSubmittedNoteItems(items)).toEqual({
      existing_items: [],
      new_items: [
        {
          item_type: "info",
          content: "First bullet",
        },
        {
          item_type: "task",
          content: "Second bullet",
        },
      ],
    });
  });
});
