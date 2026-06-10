import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const archiveRoutePath = resolve(process.cwd(), "src/pages/api/dashboard/students/[studentId]/archive.ts");
const threadPagePath = resolve(process.cwd(), "src/pages/dashboard/students/[studentId].astro");
const dashboardPath = resolve(process.cwd(), "src/pages/dashboard.astro");

const archiveRouteSource = readFileSync(archiveRoutePath, "utf8");
const threadPageSource = readFileSync(threadPagePath, "utf8");
const dashboardSource = readFileSync(dashboardPath, "utf8");

describe("professor student archival UI contract", () => {
  it("requires professor confirmation and redirects archive failures back to the student thread", () => {
    expect(archiveRouteSource).toContain('const confirmed = formData.get("confirmArchive")');
    expect(archiveRouteSource).toContain('query.set("archiveError", "Confirm the archive action before continuing.")');
    expect(archiveRouteSource).toContain("return context.redirect(redirectToStudentThread(studentId, query));");
  });

  it("redirects archive success back to the dashboard with success feedback params", () => {
    expect(archiveRouteSource).toContain('query.set("archived", "1")');
    expect(archiveRouteSource).toContain('query.set("archivedStudent", accessibleStudent.full_name)');
    expect(archiveRouteSource).toContain("return context.redirect(redirectToDashboard(query));");
  });

  it("renders a danger-zone archive form with explicit confirmation on the professor thread page", () => {
    expect(threadPageSource).toContain("Danger zone");
    expect(threadPageSource).toContain("action={`/api/dashboard/students/${student.id}/archive`}");
    expect(threadPageSource).toContain('name="confirmArchive"');
    expect(threadPageSource).toContain("Archive student");
  });

  it("renders a dashboard success banner for post-archive redirects", () => {
    expect(dashboardSource).toContain('const archived = searchParams.get("archived") === "1"');
    expect(dashboardSource).toContain('const archivedStudent = searchParams.get("archivedStudent")');
    expect(dashboardSource).toContain("was archived and removed from the active roster");
  });
});
