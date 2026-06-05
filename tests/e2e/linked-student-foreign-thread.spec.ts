import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";
import { defaultLinkedStudentStorageStatePath, readLinkedStudentFixtureMeta } from "./support/linkedStudentFixture";

// Origin: Risk #1 from context/foundation/test-plan.md.
// Protects against a linked student reaching another student's supervision history by direct URL.

test("linked student cannot open another student's thread by direct URL", async ({ baseURL, browser }) => {
  const storageStatePath = process.env.E2E_LINKED_STUDENT_STORAGE_STATE ?? defaultLinkedStudentStorageStatePath;
  const meta = readLinkedStudentFixtureMeta();
  const foreignStudentId = process.env.E2E_FOREIGN_STUDENT_ID ?? meta.foreignStudentId;

  test.skip(!fs.existsSync(storageStatePath), `Missing storageState fixture: ${storageStatePath}`);
  test.skip(!foreignStudentId, "Set E2E_FOREIGN_STUDENT_ID or provide it through linked student fixture metadata.");

  const context = await browser.newContext({
    baseURL,
    storageState: path.resolve(storageStatePath),
  });
  const page = await context.newPage();

  try {
    // Attempt the exact access-control bypass: a linked student opens a different student thread by URL.
    await page.goto(`/dashboard/students/${foreignStudentId}`);
    await page
      .waitForURL((url) => !url.pathname.endsWith(`/dashboard/students/${foreignStudentId}`), { timeout: 5_000 })
      .catch(() => undefined);

    // The business outcome is safe denial: the foreign thread route must not remain accessible.
    expect(page.url()).not.toContain(`/dashboard/students/${foreignStudentId}`);
    await expect(page.getByRole("heading", { name: "Chronological history" })).toHaveCount(0);
  } finally {
    await context.close();
  }
});
