import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  CreateNoteInput,
  CreateStudentInput,
  NoteItemRow,
  NoteRow,
  NoteWithItems,
  StudentRow,
  StudentThreadSummary,
  StudentWithHistory,
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
    items: (noteItemsData ?? []).sort((left, right) => left.position - right.position),
  } satisfies NoteWithItems;
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
