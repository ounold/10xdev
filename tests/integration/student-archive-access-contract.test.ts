import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(process.cwd(), "supabase/migrations/20260609153000_add_student_archival_lifecycle.sql");
const migrationSql = readFileSync(migrationPath, "utf8");

describe("student archive access contract migration", () => {
  it("adds explicit lifecycle, archival timestamp, and historical profile fields to students", () => {
    expect(migrationSql).toContain("create type public.student_lifecycle as enum ('active', 'archived');");
    expect(migrationSql).toContain("add column lifecycle public.student_lifecycle not null default 'active'");
    expect(migrationSql).toContain("add column archived_at timestamptz");
    expect(migrationSql).toContain(
      "add column archived_student_profile_id uuid references public.profiles (id) on delete set null",
    );
  });

  it("keeps existing rows backward-compatible by defaulting lifecycle to active", () => {
    expect(migrationSql).toContain("default 'active'");
    expect(migrationSql).not.toContain("update public.students set lifecycle = 'archived'");
  });

  it("requires archived rows to clear the active student link while preserving historical linkage metadata", () => {
    expect(migrationSql).toContain("add constraint students_archived_link_consistent check (");
    expect(migrationSql).toContain("lifecycle = 'active' or student_profile_id is null");
    expect(migrationSql).toContain("add constraint students_archived_history_consistent check (");
    expect(migrationSql).toContain("lifecycle = 'active' or archived_student_profile_id is not null");
  });

  it("limits student-side access to active linked rows while preserving professor-owned historical reads", () => {
    expect(migrationSql).toContain("create or replace function public.can_access_student(target_student_id uuid)");
    expect(migrationSql).toContain("professor_profile_id = auth.uid()");
    expect(migrationSql).toContain("lifecycle = 'active'");
    expect(migrationSql).toContain("student_profile_id = auth.uid()");
  });
});
