import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AppendNoteItemInput,
  CreateNoteInput,
  CreateStudentInput,
  NoteItemRow,
  NoteRow,
  NoteWithItems,
  StudentRow,
  StudentThreadSummary,
  StudentWithHistory,
  SetTaskCompletionInput,
  UpdateNoteInput,
} from "@/lib/database";

function toError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === "object") {
    const message =
      "message" in error && typeof error.message === "string" && error.message.length > 0
        ? error.message
        : fallbackMessage;
    const details =
      "details" in error && typeof error.details === "string" && error.details.length > 0 ? error.details : null;
    const hint = "hint" in error && typeof error.hint === "string" && error.hint.length > 0 ? error.hint : null;
    const code = "code" in error && typeof error.code === "string" && error.code.length > 0 ? error.code : null;

    return new Error([message, details, hint, code ? `code: ${code}` : null].filter(Boolean).join(" | "));
  }

  return new Error(fallbackMessage);
}

function groupItemsByNoteId(items: NoteItemRow[]) {
  return items.reduce<Map<string, NoteItemRow[]>>((accumulator, item) => {
    const existingItems = accumulator.get(item.note_id);
    if (existingItems) {
      existingItems.push(item);
    } else {
      accumulator.set(item.note_id, [item]);
    }

    return accumulator;
  }, new Map());
}

export async function listProfessorStudents(supabase: SupabaseClient): Promise<StudentThreadSummary[]> {
  const { data: studentsData, error: studentsError } = await supabase
    .from("students")
    .select("id, professor_profile_id, student_profile_id, full_name, email, created_at, updated_at")
    .order("full_name", { ascending: true })
    .overrideTypes<StudentRow[], { merge: false }>();

  if (studentsError) {
    throw toError(studentsError, "Unable to load professor-visible students.");
  }

  const students = studentsData;
  if (students.length === 0) {
    return [];
  }

  const studentIds = students.map((student) => student.id);
  const { data: notesData, error: notesError } = await supabase
    .from("notes")
    .select("student_id, meeting_date")
    .in("student_id", studentIds)
    .order("meeting_date", { ascending: false })
    .overrideTypes<Pick<NoteRow, "student_id" | "meeting_date">[], { merge: false }>();

  if (notesError) {
    throw toError(notesError, "Unable to load note summaries for professor-visible students.");
  }

  const notes = notesData;
  const noteCounts = new Map<string, number>();
  const latestMeetingDates = new Map<string, string>();

  for (const note of notes) {
    noteCounts.set(note.student_id, (noteCounts.get(note.student_id) ?? 0) + 1);
    if (!latestMeetingDates.has(note.student_id)) {
      latestMeetingDates.set(note.student_id, note.meeting_date);
    }
  }

  return students.map((student) => ({
    ...student,
    note_count: noteCounts.get(student.id) ?? 0,
    last_meeting_date: latestMeetingDates.get(student.id) ?? null,
  }));
}

export async function getStudentHistory(
  supabase: SupabaseClient,
  studentId: string,
): Promise<StudentWithHistory | null> {
  const studentResult = await supabase
    .from("students")
    .select("id, professor_profile_id, student_profile_id, full_name, email, created_at, updated_at")
    .eq("id", studentId)
    .maybeSingle();
  const studentData = studentResult.data;
  const studentError = studentResult.error;

  if (studentError) {
    throw toError(studentError, "Unable to load the selected student.");
  }

  const student = studentData;
  if (!student) {
    return null;
  }

  const { data: notesData, error: notesError } = await supabase
    .from("notes")
    .select("id, student_id, meeting_date, created_by, updated_by, created_at, updated_at")
    .eq("student_id", studentId)
    .order("meeting_date", { ascending: false })
    .order("created_at", { ascending: false })
    .overrideTypes<NoteRow[], { merge: false }>();

  if (notesError) {
    throw toError(notesError, "Unable to load note history for this student.");
  }

  const notes = notesData;
  const noteIds = notes.map((note) => note.id);
  const items = noteIds.length > 0 ? await loadNoteItems(supabase, noteIds) : [];

  const itemsByNoteId = groupItemsByNoteId(items);
  const notesWithItems: NoteWithItems[] = notes.map((note) => ({
    ...note,
    items: itemsByNoteId.get(note.id) ?? [],
  }));

  return {
    ...student,
    notes: notesWithItems,
  };
}

export async function getLinkedStudentHistoryForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<StudentWithHistory | null> {
  const studentResult = await supabase
    .from("students")
    .select("id, professor_profile_id, student_profile_id, full_name, email, created_at, updated_at")
    .eq("student_profile_id", userId)
    .maybeSingle<StudentRow>();
  const studentData = studentResult.data;
  const studentError = studentResult.error;

  if (studentError) {
    throw toError(studentError, "Unable to load the linked student record.");
  }

  const student = studentData;
  if (!student) {
    return null;
  }

  return getStudentHistory(supabase, student.id);
}

async function loadNoteItems(supabase: SupabaseClient, noteIds: string[]): Promise<NoteItemRow[]> {
  // Preserve item ordering at the shared read-model boundary for both dashboard branches and future readers.
  const noteItemsResult = await supabase
    .from("note_items")
    .select("id, note_id, position, item_type, content, completed_at, completed_by, created_at, updated_at")
    .in("note_id", noteIds)
    .order("position", { ascending: true });
  const noteItemsData = noteItemsResult.data;
  const noteItemsError = noteItemsResult.error;

  if (noteItemsError) {
    throw toError(noteItemsError, "Unable to load note items for this student.");
  }

  return noteItemsData ?? [];
}

function mapAppendedItems(noteId: string, startingPosition: number, items: AppendNoteItemInput[]) {
  return items.map((item, index) => ({
    note_id: noteId,
    position: startingPosition + index,
    item_type: item.item_type,
    content: item.content,
  }));
}

function sortItemsByPosition(items: NoteItemRow[]) {
  return [...items].sort((left, right) => left.position - right.position);
}

export async function createStudentNote(supabase: SupabaseClient, input: CreateNoteInput) {
  const { items, ...noteInput } = input;
  const noteResult = await supabase
    .from("notes")
    .insert(noteInput)
    .select("id, student_id, meeting_date, created_by, updated_by, created_at, updated_at")
    .single();
  const noteData = noteResult.data;
  const noteError = noteResult.error;

  if (noteError) {
    throw toError(noteError, "Unable to create the note row.");
  }

  if (!noteData) {
    throw new Error("Expected note creation to return a row");
  }

  const note: NoteRow = noteData;
  if (items.length === 0) {
    return {
      ...note,
      items: [],
    } satisfies NoteWithItems;
  }

  const noteItemsInput = items.map((item, index) => ({
    note_id: note.id,
    position: index + 1,
    item_type: item.item_type,
    content: item.content,
  }));

  const noteItemsResult = await supabase
    .from("note_items")
    .insert(noteItemsInput)
    .select("id, note_id, position, item_type, content, completed_at, completed_by, created_at, updated_at");
  const noteItemsData = noteItemsResult.data;
  const noteItemsError = noteItemsResult.error;

  if (noteItemsError) {
    throw toError(noteItemsError, "Unable to create note items for this note.");
  }

  return {
    ...note,
    items: sortItemsByPosition(noteItemsData ?? []),
  } satisfies NoteWithItems;
}

export async function updateStudentNote(supabase: SupabaseClient, input: UpdateNoteInput): Promise<NoteWithItems> {
  const { data: existingNote, error: noteLookupError } = await supabase
    .from("notes")
    .select("id, student_id, meeting_date, created_by, updated_by, created_at, updated_at")
    .eq("id", input.note_id)
    .eq("student_id", input.student_id)
    .maybeSingle<NoteRow>();

  if (noteLookupError) {
    throw toError(noteLookupError, "Unable to load the existing note.");
  }

  if (!existingNote) {
    throw new Error("The selected note is not accessible.");
  }

  if (existingNote.meeting_date !== input.meeting_date) {
    throw new Error("Meeting date cannot be changed for an existing note.");
  }

  if (existingNote.created_by !== input.created_by) {
    throw new Error("Note ownership cannot be changed for an existing note.");
  }

  const currentItems = await loadNoteItems(supabase, [input.note_id]);
  const currentItemsById = new Map(currentItems.map((item) => [item.id, item]));

  for (const item of input.existing_items) {
    if (!currentItemsById.has(item.id)) {
      throw new Error("The selected note item is not accessible.");
    }
  }

  const noteUpdateResult = await supabase
    .from("notes")
    .update({
      updated_by: input.updated_by,
    })
    .eq("id", input.note_id)
    .eq("student_id", input.student_id)
    .select("id, student_id, meeting_date, created_by, updated_by, created_at, updated_at")
    .single();
  const updatedNoteData = noteUpdateResult.data;
  const noteUpdateError = noteUpdateResult.error;

  if (noteUpdateError) {
    throw toError(noteUpdateError, "Unable to update the note.");
  }

  if (!updatedNoteData) {
    throw new Error("Expected note update to return a row");
  }

  for (const item of input.existing_items) {
    const currentItem = currentItemsById.get(item.id);
    if (!currentItem) {
      throw new Error("The selected note item is not accessible.");
    }

    const { error: itemUpdateError } = await supabase
      .from("note_items")
      .update({
        item_type: item.item_type,
        content: item.content,
      })
      .eq("id", item.id)
      .eq("note_id", input.note_id);

    if (itemUpdateError) {
      throw toError(itemUpdateError, "Unable to update one of the existing note items.");
    }
  }

  if (input.new_items.length > 0) {
    const maxPosition = currentItems.reduce((highestPosition, item) => Math.max(highestPosition, item.position), 0);
    const noteItemsResult = await supabase
      .from("note_items")
      .insert(mapAppendedItems(input.note_id, maxPosition + 1, input.new_items))
      .select("id, note_id, position, item_type, content, completed_at, completed_by, created_at, updated_at");
    const noteItemsError = noteItemsResult.error;

    if (noteItemsError) {
      throw toError(noteItemsError, "Unable to append new note items.");
    }
  }

  const latestItems = await loadNoteItems(supabase, [input.note_id]);

  return {
    ...updatedNoteData,
    items: sortItemsByPosition(latestItems),
  } satisfies NoteWithItems;
}

export async function setTaskCompletion(supabase: SupabaseClient, input: SetTaskCompletionInput): Promise<NoteItemRow> {
  const { data: existingItem, error: itemLookupError } = await supabase
    .from("note_items")
    .select("id, note_id, position, item_type, content, completed_at, completed_by, created_at, updated_at")
    .eq("id", input.note_item_id)
    .eq("note_id", input.note_id)
    .maybeSingle<NoteItemRow>();

  if (itemLookupError) {
    throw toError(itemLookupError, "Unable to load the selected note item.");
  }

  if (!existingItem) {
    throw new Error("The selected note item is not accessible.");
  }

  if (existingItem.item_type !== "task") {
    throw new Error("Only task items can change completion state.");
  }

  const completionPatch =
    input.state === "complete"
      ? {
          completed_at: new Date().toISOString(),
          completed_by: input.completed_by,
        }
      : {
          completed_at: null,
          completed_by: null,
        };

  const { data: updatedItem, error: itemUpdateError } = await supabase
    .from("note_items")
    .update(completionPatch)
    .eq("id", input.note_item_id)
    .eq("note_id", input.note_id)
    .select("id, note_id, position, item_type, content, completed_at, completed_by, created_at, updated_at")
    .single<NoteItemRow>();

  if (itemUpdateError) {
    throw toError(itemUpdateError, "Unable to update task completion state.");
  }

  return updatedItem;
}

export async function createProfessorStudent(supabase: SupabaseClient, input: CreateStudentInput): Promise<StudentRow> {
  const studentResult = await supabase
    .from("students")
    .insert(input)
    .select("id, professor_profile_id, student_profile_id, full_name, email, created_at, updated_at")
    .single();
  const studentData = studentResult.data;
  const studentError = studentResult.error;

  if (studentError) {
    throw toError(studentError, "Unable to create the student record.");
  }

  if (!studentData) {
    throw new Error("Expected student creation to return a row");
  }

  return studentData satisfies StudentRow;
}
