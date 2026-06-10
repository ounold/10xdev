export type AppRole = "professor" | "student";
export type NoteItemType = "info" | "task";
export type StudentLifecycle = "active" | "archived";

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
  archived_student_profile_id: string | null;
  lifecycle: StudentLifecycle;
  archived_at: string | null;
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
  linking_status: "linked" | "claim-ready" | "missing-email";
}

export interface ArchiveStudentInput {
  student_id: string;
}

export interface ArchiveStudentResult extends StudentRow {
  archived_from_student_profile_id: string;
}

export type StudentLinkClaimStatus =
  | "claimable"
  | "missing-email"
  | "missing-match"
  | "ambiguous-match"
  | "already-linked";

export interface StudentLinkClaimTarget {
  student_id: string;
  full_name: string;
  email: string;
}

export interface StudentLinkClaimability {
  status: StudentLinkClaimStatus;
  normalized_email: string | null;
  target: StudentLinkClaimTarget | null;
  conflict_count: number;
}

export interface ClaimStudentLinkInput {
  user_id: string;
  email: string;
}

export interface ClaimStudentLinkResult {
  status: Extract<
    StudentLinkClaimStatus,
    "claimable" | "missing-email" | "missing-match" | "ambiguous-match" | "already-linked"
  >;
  linked_student_id: string | null;
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
