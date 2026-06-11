import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { hasArchivedStudentEmailReuse } from "@/lib/supervision";
import { createSupabaseStub } from "./support/supabaseStub";

const createStudentRoutePath = resolve(process.cwd(), "src/pages/api/dashboard/students.ts");
const dashboardPath = resolve(process.cwd(), "src/pages/dashboard.astro");

const createStudentRouteSource = readFileSync(createStudentRoutePath, "utf8");
const dashboardSource = readFileSync(dashboardPath, "utf8");

describe("student re-registration warning contract", () => {
  it("detects archived email reuse only from archived rows inside the professor workspace", async () => {
    const supabase = createSupabaseStub({
      students: [
        {
          id: "archived-match",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          archived_student_profile_id: "student-archived-profile",
          lifecycle: "archived",
          archived_at: "2026-06-10T10:00:00Z",
          full_name: "Archived Match",
          email: "returning@example.com",
          created_at: "2026-06-01T10:00:00Z",
          updated_at: "2026-06-10T10:00:00Z",
        },
        {
          id: "active-same-email",
          professor_profile_id: "prof-1",
          student_profile_id: null,
          archived_student_profile_id: null,
          lifecycle: "active",
          archived_at: null,
          full_name: "Active Same Email",
          email: "returning@example.com",
          created_at: "2026-06-11T10:00:00Z",
          updated_at: "2026-06-11T10:00:00Z",
        },
        {
          id: "archived-other-professor",
          professor_profile_id: "prof-2",
          student_profile_id: null,
          archived_student_profile_id: "student-archived-profile-2",
          lifecycle: "archived",
          archived_at: "2026-06-10T11:00:00Z",
          full_name: "Other Professor Archived Match",
          email: "other@example.com",
          created_at: "2026-06-01T10:00:00Z",
          updated_at: "2026-06-10T11:00:00Z",
        },
      ],
    });

    await expect(hasArchivedStudentEmailReuse(supabase as never, "prof-1", "returning@example.com")).resolves.toBe(
      true,
    );
    await expect(hasArchivedStudentEmailReuse(supabase as never, "prof-1", "missing@example.com")).resolves.toBe(false);
    await expect(hasArchivedStudentEmailReuse(supabase as never, "prof-1", "other@example.com")).resolves.toBe(false);
  });

  it("marks successful creation redirects when the new student reuses archived email history", () => {
    expect(createStudentRouteSource).toContain("hasArchivedStudentEmailReuse");
    expect(createStudentRouteSource).toContain('query.set("creationArchivedReuse", "1")');
    expect(createStudentRouteSource).toContain('query.set("creationArchivedEmail", email)');
    expect(createStudentRouteSource).toContain('query.set("creationReady", "1")');
  });

  it("renders both pre-submit and post-success archived-history warnings on the professor dashboard", () => {
    expect(dashboardSource).toContain(
      'const creationArchivedReuse = searchParams.get("creationArchivedReuse") === "1"',
    );
    expect(dashboardSource).toContain('const creationArchivedEmail = searchParams.get("creationArchivedEmail")');
    expect(dashboardSource).toContain("const archivedRosterEmails =");
    expect(dashboardSource).toContain("const draftEmailMatchesArchivedHistory =");
    expect(dashboardSource).toContain('id="student-archived-email-hint"');
    expect(dashboardSource).toContain("This email already belongs to an archived student thread.");
    expect(dashboardSource).toContain("Archived history already exists for");
    expect(dashboardSource).toContain('data-archived-warning-target="student-archived-email-hint"');
  });
});
