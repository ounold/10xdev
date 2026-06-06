import { describe, expect, it } from "vitest";

import { listProfessorStudents } from "@/lib/supervision";
import { createSupabaseStub } from "./support/supabaseStub";

describe("professor roster link status", () => {
  it("surfaces linked, email-ready, and missing-email roster states", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-linked",
          professor_profile_id: "prof-1",
          student_profile_id: "user-1",
          full_name: "Linked Student",
          email: "linked@example.com",
          created_at: "2026-06-05T08:00:00Z",
          updated_at: "2026-06-05T08:00:00Z",
        },
        {
          id: "student-claim-ready",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          full_name: "Claim Ready Student",
          email: "claim-ready@example.com",
          created_at: "2026-06-05T09:00:00Z",
          updated_at: "2026-06-05T09:00:00Z",
        },
        {
          id: "student-missing-email",
          professor_profile_id: "prof-1",
          student_profile_id: null,
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
});
