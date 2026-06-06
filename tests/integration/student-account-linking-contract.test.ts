import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/server", () => ({
  BOOTSTRAP_PROFESSOR_EMAIL: "bootstrap@example.com",
}));

vi.mock("@/lib/supabase", () => ({
  createAdminClient: vi.fn(),
}));

import { getStudentLinkClaimabilityForUser } from "@/lib/profile";
import type { StudentRow } from "@/lib/database";
import { claimStudentLink } from "@/lib/supervision";
import { createSupabaseStub } from "./support/supabaseStub";

describe("student account linking contract", () => {
  it("returns claimable when exactly one unlinked student email matches the signed-in user", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-1",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          full_name: "Linked By Email",
          email: "student@example.com",
          created_at: "2026-06-05T08:00:00Z",
          updated_at: "2026-06-05T08:00:00Z",
        },
      ],
    });

    const { createAdminClient } = await import("@/lib/supabase");
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getStudentLinkClaimabilityForUser({
      id: "user-1",
      email: " Student@Example.com ",
    } as never);

    expect(result).toEqual({
      status: "claimable",
      normalized_email: "student@example.com",
      target: {
        student_id: "student-1",
        full_name: "Linked By Email",
        email: "student@example.com",
      },
      conflict_count: 1,
    });

    expect(supabase.trace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "students",
          method: "is",
          args: ["student_profile_id", null],
        }),
      ]),
    );
  });

  it("returns ambiguous-match when duplicate unlinked student rows share the same email", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-1",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          full_name: "First Match",
          email: "student@example.com",
          created_at: "2026-06-05T08:00:00Z",
          updated_at: "2026-06-05T08:00:00Z",
        },
        {
          id: "student-2",
          professor_profile_id: "prof-2",
          student_profile_id: null,
          full_name: "Second Match",
          email: "student@example.com",
          created_at: "2026-06-05T09:00:00Z",
          updated_at: "2026-06-05T09:00:00Z",
        },
      ],
    });

    const { createAdminClient } = await import("@/lib/supabase");
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getStudentLinkClaimabilityForUser({
      id: "user-1",
      email: "student@example.com",
    } as never);

    expect(result).toEqual({
      status: "ambiguous-match",
      normalized_email: "student@example.com",
      target: null,
      conflict_count: 2,
    });
  });

  it("returns already-linked when the signed-in user is already attached to a student row", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-1",
          professor_profile_id: "prof-1",
          student_profile_id: "user-1",
          full_name: "Already Linked",
          email: "student@example.com",
          created_at: "2026-06-05T08:00:00Z",
          updated_at: "2026-06-05T08:00:00Z",
        },
      ],
    });

    const { createAdminClient } = await import("@/lib/supabase");
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const result = await getStudentLinkClaimabilityForUser({
      id: "user-1",
      email: "student@example.com",
    } as never);

    expect(result.status).toBe("already-linked");
    expect(result.target?.student_id).toBe("student-1");
  });

  it("links only the intended row by setting student_profile_id when one match exists", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-1",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          full_name: "Claim Target",
          email: "student@example.com",
          created_at: "2026-06-05T08:00:00Z",
          updated_at: "2026-06-05T08:00:00Z",
        },
        {
          id: "student-2",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          full_name: "Other Student",
          email: "other@example.com",
          created_at: "2026-06-05T08:00:00Z",
          updated_at: "2026-06-05T08:00:00Z",
        },
      ],
    });

    const result = await claimStudentLink(supabase as never, {
      user_id: "user-1",
      email: "student@example.com",
    });

    expect(result).toEqual({
      status: "claimable",
      linked_student_id: "student-1",
    });

    const studentsResult = await (
      supabase as { from: (table: string) => { select: (query: string) => Promise<{ data: StudentRow[] | null }> } }
    )
      .from("students")
      .select("*");
    const students = studentsResult.data;
    expect(students).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "student-1",
          student_profile_id: "user-1",
        }),
        expect.objectContaining({
          id: "student-2",
          student_profile_id: null,
        }),
      ]),
    );

    expect(supabase.trace).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: "students",
          method: "is",
          args: ["student_profile_id", null],
        }),
      ]),
    );
  });

  it("refuses to relink when the user already has a linked student row", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-1",
          professor_profile_id: "prof-1",
          student_profile_id: "user-1",
          full_name: "Existing Link",
          email: "student@example.com",
          created_at: "2026-06-05T08:00:00Z",
          updated_at: "2026-06-05T08:00:00Z",
        },
        {
          id: "student-2",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          full_name: "Would Be Wrong",
          email: "student@example.com",
          created_at: "2026-06-05T09:00:00Z",
          updated_at: "2026-06-05T09:00:00Z",
        },
      ],
    });

    const result = await claimStudentLink(supabase as never, {
      user_id: "user-1",
      email: "student@example.com",
    });

    expect(result).toEqual({
      status: "already-linked",
      linked_student_id: "student-1",
    });
  });

  it("keeps the student non-claimable after a successful link because the same stub state is now linked", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-1",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          full_name: "Claim Then Link",
          email: "student@example.com",
          created_at: "2026-06-05T08:00:00Z",
          updated_at: "2026-06-05T08:00:00Z",
        },
      ],
    });

    const { createAdminClient } = await import("@/lib/supabase");
    vi.mocked(createAdminClient).mockReturnValue(supabase as never);

    const beforeClaim = await getStudentLinkClaimabilityForUser({
      id: "user-1",
      email: "student@example.com",
    } as never);
    expect(beforeClaim.status).toBe("claimable");

    const claimResult = await claimStudentLink(supabase as never, {
      user_id: "user-1",
      email: "student@example.com",
    });
    expect(claimResult).toEqual({
      status: "claimable",
      linked_student_id: "student-1",
    });

    const afterClaim = await getStudentLinkClaimabilityForUser({
      id: "user-1",
      email: "student@example.com",
    } as never);

    expect(afterClaim).toEqual({
      status: "already-linked",
      normalized_email: "student@example.com",
      target: {
        student_id: "student-1",
        full_name: "Claim Then Link",
        email: "student@example.com",
      },
      conflict_count: 0,
    });
  });

  it("does not partially link any student row when duplicate matches block the claim", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "student-1",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          full_name: "Duplicate A",
          email: "student@example.com",
          created_at: "2026-06-05T08:00:00Z",
          updated_at: "2026-06-05T08:00:00Z",
        },
        {
          id: "student-2",
          professor_profile_id: "prof-2",
          student_profile_id: null,
          full_name: "Duplicate B",
          email: "student@example.com",
          created_at: "2026-06-05T09:00:00Z",
          updated_at: "2026-06-05T09:00:00Z",
        },
      ],
    });

    const result = await claimStudentLink(supabase as never, {
      user_id: "user-1",
      email: "student@example.com",
    });

    expect(result).toEqual({
      status: "ambiguous-match",
      linked_student_id: null,
    });

    const studentsResult = await (
      supabase as { from: (table: string) => { select: (query: string) => Promise<{ data: StudentRow[] | null }> } }
    )
      .from("students")
      .select("*");

    expect(studentsResult.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "student-1", student_profile_id: null }),
        expect.objectContaining({ id: "student-2", student_profile_id: null }),
      ]),
    );
  });
});
