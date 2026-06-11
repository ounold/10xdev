import React, { useMemo, useState } from "react";

import type { NoteItemType } from "@/lib/database";
import { cn } from "@/lib/utils";

interface NoteItemDraft {
  id: string;
  persistedId?: string;
  itemType: NoteItemType;
  content: string;
}

interface Props {
  action: string;
  defaultMeetingDate: string;
  defaultItems?: {
    id?: string;
    itemType: NoteItemType;
    content: string;
  }[];
  noteId?: string;
  meetingDateReadOnly?: boolean;
  mode?: "create" | "edit";
}

interface FormErrors {
  meetingDate?: string;
  items?: string;
}

function createDraft(itemType: NoteItemType = "info"): NoteItemDraft {
  return {
    id: crypto.randomUUID(),
    itemType,
    content: "",
  };
}

function createDraftFromDefault(item: { id?: string; itemType: NoteItemType; content: string }): NoteItemDraft {
  return {
    id: crypto.randomUUID(),
    persistedId: item.id,
    itemType: item.itemType,
    content: item.content,
  };
}

export default function StudentNoteForm({
  action,
  defaultMeetingDate,
  defaultItems,
  noteId,
  meetingDateReadOnly = false,
  mode = "create",
}: Props) {
  const [meetingDate, setMeetingDate] = useState(defaultMeetingDate);
  const [items, setItems] = useState<NoteItemDraft[]>(
    defaultItems && defaultItems.length > 0
      ? defaultItems.map((item) => createDraftFromDefault(item))
      : [createDraft("info"), createDraft("task")],
  );
  const [errors, setErrors] = useState<FormErrors>({});

  const serializedItems = useMemo(
    () =>
      JSON.stringify(
        items.map((item) => ({
          id: item.persistedId,
          item_type: item.itemType,
          content: item.content.trim(),
        })),
      ),
    [items],
  );

  function updateItem(id: string, patch: Partial<NoteItemDraft>) {
    setItems((currentItems) =>
      currentItems.map((item) => {
        if (item.id !== id) {
          return item;
        }

        return {
          ...item,
          ...patch,
        };
      }),
    );

    if (errors.items) {
      setErrors((currentErrors) => ({ ...currentErrors, items: undefined }));
    }
  }

  function removeItem(id: string) {
    setItems((currentItems) => {
      const nextItems = currentItems.filter((item) => item.id !== id);
      return nextItems.length > 0 ? nextItems : currentItems;
    });

    if (errors.items) {
      setErrors((currentErrors) => ({ ...currentErrors, items: undefined }));
    }
  }

  function addItem(itemType: NoteItemType) {
    setItems((currentItems) => [...currentItems, createDraft(itemType)]);
    if (errors.items) {
      setErrors((currentErrors) => ({ ...currentErrors, items: undefined }));
    }
  }

  function validate() {
    const nextErrors: FormErrors = {};

    if (!meetingDate) {
      nextErrors.meetingDate = "Meeting date is required.";
    }

    const normalizedItems = items
      .map((item) => ({
        ...item,
        content: item.content.trim(),
      }))
      .filter((item) => item.content.length > 0);

    if (normalizedItems.length === 0) {
      nextErrors.items = "Add at least one note item with content.";
    } else if (normalizedItems.length !== items.length) {
      nextErrors.items = "Remove empty rows or fill them before saving.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  return (
    <form
      method="POST"
      action={action}
      className="space-y-5"
      onSubmit={(event) => {
        if (!validate()) {
          event.preventDefault();
        }
      }}
      noValidate
    >
      {noteId ? <input type="hidden" name="noteId" value={noteId} /> : null}
      {meetingDateReadOnly ? <input type="hidden" name="meetingDate" value={meetingDate} /> : null}
      <input type="hidden" name="itemsPayload" value={serializedItems} />

      <div className="grid gap-4 md:grid-cols-[minmax(0,14rem)_1fr] md:items-start">
        <label className="space-y-2">
          <span className="text-sm font-medium text-white">Meeting date</span>
          <input
            type="date"
            name={meetingDateReadOnly ? undefined : "meetingDate"}
            value={meetingDate}
            disabled={meetingDateReadOnly}
            onChange={(event) => {
              setMeetingDate(event.target.value);
              if (errors.meetingDate) {
                setErrors((currentErrors) => ({ ...currentErrors, meetingDate: undefined }));
              }
            }}
            className={cn(
              "w-full rounded-xl border bg-slate-950/40 px-3 py-2 text-sm text-white transition outline-none",
              meetingDateReadOnly ? "cursor-not-allowed opacity-80" : "",
              errors.meetingDate
                ? "border-rose-300/70 focus:border-rose-200"
                : "border-white/10 focus:border-cyan-300/50",
            )}
          />
          {errors.meetingDate ? <p className="text-xs text-rose-200">{errors.meetingDate}</p> : null}
        </label>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Thread items</p>
              <p className="mt-1 text-xs leading-5 text-slate-300/75">
                Capture short bullet points in the order they happened. Use <code>info</code> for context and{" "}
                <code>task</code> for follow-ups.
              </p>
              {mode === "edit" ? (
                <p className="mt-2 text-xs leading-5 text-amber-100/80">
                  Existing items can be edited in place and new items can be appended. Removing saved items is not
                  supported in this slice.
                </p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  addItem("info");
                }}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
              >
                Add info
              </button>
              <button
                type="button"
                onClick={() => {
                  addItem("task");
                }}
                className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-50 transition hover:bg-cyan-300/20"
              >
                Add task
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-[7rem_auto] md:items-end md:justify-between">
                    <label className="space-y-2">
                      <span className="text-[11px] font-medium tracking-[0.2em] text-slate-300/80 uppercase">Type</span>
                      {item.persistedId ? (
                        <select
                          value={item.itemType}
                          onChange={(event) => {
                            updateItem(item.id, { itemType: event.target.value as NoteItemType });
                          }}
                          className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white transition outline-none focus:border-cyan-300/50"
                        >
                          <option value="info">info</option>
                          <option value="task">task</option>
                        </select>
                      ) : (
                        <div className="rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white">
                          {item.itemType}
                        </div>
                      )}
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        removeItem(item.id);
                      }}
                      disabled={Boolean(item.persistedId) || items.length === 1}
                      className={cn(
                        "rounded-xl px-3 py-2 text-sm transition",
                        item.persistedId || items.length === 1
                          ? "cursor-not-allowed border border-white/5 bg-white/[0.03] text-slate-500"
                          : "border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
                      )}
                    >
                      {item.persistedId ? "Saved item" : "Remove"}
                    </button>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-[11px] font-medium tracking-[0.2em] text-slate-300/80 uppercase">
                      Item {index + 1}
                    </span>
                    <textarea
                      rows={2}
                      value={item.content}
                      onChange={(event) => {
                        updateItem(item.id, { content: event.target.value });
                      }}
                      placeholder={
                        item.itemType === "task" ? "Prepare the follow-up action" : "What happened in the meeting?"
                      }
                      className="min-h-[5.5rem] w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white transition outline-none focus:border-cyan-300/50"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          {errors.items ? <p className="text-xs text-rose-200">{errors.items}</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="text-xs text-slate-300/70">
          {mode === "edit"
            ? "This updates one existing note, keeps saved item order stable, and only appends new items at the tail."
            : "This adds one dated note and keeps the current item order as saved."}
        </p>
        <button
          type="submit"
          className="rounded-xl border border-cyan-300/20 bg-cyan-300/15 px-4 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/25"
        >
          {mode === "edit" ? "Save note changes" : "Save note to this thread"}
        </button>
      </div>
    </form>
  );
}
