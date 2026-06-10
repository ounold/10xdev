import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const threadPagePath = resolve(process.cwd(), "src/pages/dashboard/students/[studentId].astro");
const threadPageSource = readFileSync(threadPagePath, "utf8");

const noteRoutePath = resolve(process.cwd(), "src/pages/api/dashboard/students/[studentId]/notes.ts");
const noteRouteSource = readFileSync(noteRoutePath, "utf8");

const completionRoutePath = resolve(
  process.cwd(),
  "src/pages/api/dashboard/students/[studentId]/notes/[noteId]/items/[itemId]/completion.ts",
);
const completionRouteSource = readFileSync(completionRoutePath, "utf8");

describe("archived student history thread contract", () => {
  it("renders a strong archived-thread read-only banner and archive-aware back navigation", () => {
    expect(threadPageSource).toContain('const isArchivedThread = student?.lifecycle === "archived"');
    expect(threadPageSource).toContain('href={isArchivedThread ? "/dashboard?roster=archived" : "/dashboard"}');
    expect(threadPageSource).toContain("Read-only supervision history");
    expect(threadPageSource).toContain("Read-only archive");
  });

  it("removes note-edit and task-toggle controls from the archived branch while keeping direct archived URLs readable", () => {
    expect(threadPageSource).toContain(
      '{isArchivedThread ? "Back to archived student threads" : "Back to student threads"}',
    );
    expect(threadPageSource).toContain("Read-only note");
    expect(threadPageSource).toContain('item.item_type === "task" && !isArchivedThread');
    expect(threadPageSource).toContain("{isArchivedThread ? null : (");
  });

  it("guards professor note writes and task completion writes when the selected thread is archived", () => {
    expect(noteRouteSource).toContain('if (accessibleStudent.lifecycle === "archived")');
    expect(noteRouteSource).toContain('query.set("error", "Archived student threads are read-only.")');
    expect(noteRouteSource).toContain('query.set("roster", "archived")');

    expect(completionRouteSource).toContain('if (accessibleStudent.lifecycle === "archived")');
    expect(completionRouteSource).toContain('query.set("error", "Archived student threads are read-only.")');
    expect(completionRouteSource).toContain('query.set("roster", "archived")');
  });
});
