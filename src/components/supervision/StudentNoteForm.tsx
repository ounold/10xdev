import { useMemo, useState } from "react";

import type { NoteItemType } from "@/lib/database";
import { cn } from "@/lib/utils";

interface NoteItemDraft {
  id: string;
  itemType: NoteItemType;
  content: string;
}

interface Props {
  action: string;
  defaultMeetingDate: string;
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

export default function StudentNoteForm({ action, defaultMeetingDate }: Props) {
  const [meetingDate, setMeetingDate] = useState(defaultMeetingDate);
  const [items, setItems] = useState<NoteItemDraft[]>([createDraft("info"), createDraft("task")]);
  const [errors, setErrors] = useState<FormErrors>({});

  const serializedItems = useMemo(
    () =>
      JSON.stringify(
        items.map((item) => ({
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
    setItems((currentItems) =>
      currentItems.length > 1 ? currentItems.filter((item) => item.id !== id) : currentItems,
    );

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
      <input type="hidden" name="itemsPayload" value={serializedItems} />

      <div className="grid gap-4 md:grid-cols-[minmax(0,14rem)_1fr] md:items-start">
        <label className="space-y-2">
          <span className="text-sm font-medium text-white">Meeting date</span>
          <input
            type="date"
            name="meetingDate"
            value={meetingDate}
            onChange={(event) => {
              setMeetingDate(event.target.value);
              if (errors.meetingDate) {
                setErrors((currentErrors) => ({ ...currentErrors, meetingDate: undefined }));
              }
            }}
            className={cn(
              "w-full rounded-xl border bg-slate-950/40 px-3 py-2 text-sm text-white transition outline-none",
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
                <div className="grid gap-3 md:grid-cols-[7rem_1fr_auto] md:items-start">
                  <label className="space-y-2">
                    <span className="text-[11px] font-medium tracking-[0.2em] text-slate-300/80 uppercase">Type</span>
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
                  </label>

                  <label className="space-y-2">
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
                      className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white transition outline-none focus:border-cyan-300/50"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      removeItem(item.id);
                    }}
                    disabled={items.length === 1}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm transition md:mt-7",
                      items.length === 1
                        ? "cursor-not-allowed border border-white/5 bg-white/[0.03] text-slate-500"
                        : "border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
                    )}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {errors.items ? <p className="text-xs text-rose-200">{errors.items}</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
        <p className="text-xs text-slate-300/70">This adds one dated note and keeps the current item order as saved.</p>
        <button
          type="submit"
          className="rounded-xl border border-cyan-300/20 bg-cyan-300/15 px-4 py-2 text-sm font-medium text-cyan-50 transition hover:bg-cyan-300/25"
        >
          Save note to this thread
        </button>
      </div>
    </form>
  );
}
