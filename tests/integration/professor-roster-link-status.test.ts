import { describe, expect, it } from "vitest";

import { claimStudentLink, listProfessorStudents } from "@/lib/supervision";
import { createSupabaseStub } from "./support/supabaseStub";

describe("professor roster link status", () => {
  it("surfaces linked, email-ready, and missing-email roster states", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-linked",
          professor_profile_id: "prof-1",
          student_profile_id: "user-1",
          archived_student_profile_id: null,
          lifecycle: "active",
          archived_at: null,
          full_name: "Linked Student",
          email: "linked@example.com",
          created_at: "2026-06-05T08:00:00Z",
          updated_at: "2026-06-05T08:00:00Z",
        },
        {
          id: "student-claim-ready",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          archived_student_profile_id: null,
          lifecycle: "active",
          archived_at: null,
          full_name: "Claim Ready Student",
          email: "claim-ready@example.com",
          created_at: "2026-06-05T09:00:00Z",
          updated_at: "2026-06-05T09:00:00Z",
        },
        {
          id: "student-missing-email",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          archived_student_profile_id: null,
          lifecycle: "active",
          archived_at: null,
          full_name: "Missing Email Student",
          email: null,
          created_at: "2026-06-05T10:00:00Z",
          updated_at: "2026-06-05T10:00:00Z",
        },
      ],
      notes: [],
      note_items: [],
    });

    const roster = await listProfessorStudents(supabase as never);

    expect(roster.map((student) => [student.id, student.linking_status])).toEqual([
      ["student-claim-ready", "claim-ready"],
      ["student-linked", "linked"],
      ["student-missing-email", "missing-email"],
    ]);
  });

  it("shows a claimed student as linked in the professor roster after the claim mutation succeeds", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-claim-ready",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          archived_student_profile_id: null,
          lifecycle: "active",
          archived_at: null,
          full_name: "Claim Ready Student",
          email: "claim-ready@example.com",
          created_at: "2026-06-05T09:00:00Z",
          updated_at: "2026-06-05T09:00:00Z",
        },
      ],
      notes: [],
      note_items: [],
    });

    const claimResult = await claimStudentLink(supabase as never, {
      user_id: "user-claim",
      email: "claim-ready@example.com",
    });

    expect(claimResult).toEqual({
      status: "claimable",
      linked_student_id: "student-claim-ready",
    });

    const roster = await listProfessorStudents(supabase as never);

    expect(roster).toEqual([
      expect.objectContaining({
        id: "student-claim-ready",
        linking_status: "linked",
        student_profile_id: "user-claim",
      }),
    ]);
  });
});
