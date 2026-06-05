import type { NoteItemType, UpdateExistingNoteItemInput } from "@/lib/database";

export interface SubmittedNoteItemInput {
  id?: string;
  item_type: NoteItemType;
  content: string;
}

function isNoteItemType(value: string): value is NoteItemType {
  return value === "info" || value === "task";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function normalizeSubmittedNoteItems(rawPayload: FormDataEntryValue | null): SubmittedNoteItemInput[] {
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

  return parsed.flatMap((item): SubmittedNoteItemInput[] => {
    if (!isRecord(item)) {
      return [];
    }

    const itemType = typeof item.item_type === "string" ? item.item_type : "";
    const content = typeof item.content === "string" ? item.content.trim() : "";
    const id = typeof item.id === "string" && item.id.length > 0 ? item.id : undefined;

    if (!isNoteItemType(itemType) || content.length === 0) {
      return [];
    }

    return [
      {
        id,
        item_type: itemType,
        content,
      },
    ];
  });
}

export function splitSubmittedNoteItems(items: SubmittedNoteItemInput[]) {
  const existing_items: UpdateExistingNoteItemInput[] = [];
  const new_items: Pick<SubmittedNoteItemInput, "item_type" | "content">[] = [];

  for (const item of items) {
    if (item.id) {
      existing_items.push({
        id: item.id,
        item_type: item.item_type,
        content: item.content,
      });
      continue;
    }

    new_items.push({
      item_type: item.item_type,
      content: item.content,
    });
  }

  return {
    existing_items,
    new_items,
  };
}
