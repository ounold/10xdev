export type AppRole = "professor" | "student";
export type NoteItemType = "info" | "task";

export interface ProfileRow {
  id: string;
  role: AppRole;
  display_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentRow {
  id: string;
  professor_profile_id: string;
  student_profile_id: string | null;
  full_name: string;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteRow {
  id: string;
  student_id: string;
  meeting_date: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface NoteItemRow {
  id: string;
  note_id: string;
  position: number;
  item_type: NoteItemType;
  content: string;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteWithItems extends NoteRow {
  items: NoteItemRow[];
}

export interface StudentWithHistory extends StudentRow {
  notes: NoteWithItems[];
}

export interface StudentThreadSummary extends StudentRow {
  note_count: number;
  last_meeting_date: string | null;
}

export interface CreateNoteItemInput {
  item_type: NoteItemType;
  content: string;
}

export interface UpdateExistingNoteItemInput {
  id: string;
  item_type: NoteItemType;
  content: string;
}

export interface AppendNoteItemInput {
  item_type: NoteItemType;
  content: string;
}

export type TaskCompletionState = "complete" | "incomplete";

export interface CreateNoteInput {
  student_id: string;
  meeting_date: string;
  created_by: string;
  updated_by: string;
  items: CreateNoteItemInput[];
}

export interface UpdateNoteInput {
  note_id: string;
  student_id: string;
  meeting_date: string;
  created_by: string;
  updated_by: string;
  existing_items: UpdateExistingNoteItemInput[];
  new_items: AppendNoteItemInput[];
}

export interface SetTaskCompletionInput {
  note_id: string;
  note_item_id: string;
  completed_by: string;
  state: TaskCompletionState;
}

export interface CreateStudentInput {
  professor_profile_id: string;
  full_name: string;
  email: string | null;
}

export interface CreateStudentFormInput {
  full_name: string;
  email: string;
}
