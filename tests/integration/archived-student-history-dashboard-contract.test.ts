import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const dashboardPath = resolve(process.cwd(), "src/pages/dashboard.astro");
const dashboardSource = readFileSync(dashboardPath, "utf8");

describe("archived student history dashboard contract", () => {
  it("loads the archived roster helper for the professor dashboard", () => {
    expect(dashboardSource).toContain("listArchivedProfessorStudents");
    expect(dashboardSource).toContain('const archivedStudents = supabase && role === "professor"');
  });

  it("supports switching the roster between active and archived views", () => {
    expect(dashboardSource).toContain(
      'const rosterView = searchParams.get("roster") === "archived" ? "archived" : "active"',
    );
    expect(dashboardSource).toContain('href="/dashboard?roster=archived"');
    expect(dashboardSource).toContain('rosterView === "active"');
    expect(dashboardSource).toContain('rosterView === "archived"');
    expect(dashboardSource).toContain("Active");
    expect(dashboardSource).toContain("Archived");
  });

  it("renders archived roster items with an archived badge and archived-thread link", () => {
    expect(dashboardSource).toContain("getProfessorArchiveStatusBadge");
    expect(dashboardSource).toContain("Professor-only history");
    expect(dashboardSource).toContain("/dashboard/students/${student.id}?roster=archived");
  });
});
