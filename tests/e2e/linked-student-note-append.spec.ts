import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { defaultLinkedStudentStorageStatePath } from "./support/linkedStudentFixture";
import { loadE2EEnv } from "./support/env";

loadE2EEnv();

async function deleteAppendedItem(noteId: string, appendedContent: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return;
  }

  await fetch(
    `${supabaseUrl}/rest/v1/note_items?note_id=eq.${encodeURIComponent(noteId)}&content=eq.${encodeURIComponent(
      appendedContent,
    )}`,
    {
      method: "DELETE",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );
}

test("linked student can append a new task item to their shared note", async ({ baseURL, browser }) => {
  const storageStatePath = process.env.E2E_LINKED_STUDENT_STORAGE_STATE ?? defaultLinkedStudentStorageStatePath;

  test.skip(!fs.existsSync(storageStatePath), `Missing storageState fixture: ${storageStatePath}`);

  const context = await browser.newContext({
    baseURL,
    storageState: path.resolve(storageStatePath),
  });
  const page = await context.newPage();
  const appendedContent = `linked student appended task ${Date.now()}`;
  let noteId: string | null = null;

  try {
    await page.goto("/dashboard");

    const noteEditLinks = page.getByRole("link", { name: "Edit note" });
    await expect(noteEditLinks.last()).toBeVisible();
    await noteEditLinks.last().click();

    await page.waitForURL(/\/dashboard\?edit=/);
    noteId = new URL(page.url()).searchParams.get("edit");
    await expect(page.getByRole("heading", { name: /Update .* inside your shared thread/ })).toBeVisible();

    const savedButtonsBefore = await page.getByRole("button", { name: "Saved item" }).count();
    const textareasBefore = await page.locator("textarea").count();

    await page.getByRole("button", { name: "Add task" }).click();
    const textareasAfterAppend = page.locator("textarea");
    await expect(textareasAfterAppend).toHaveCount(textareasBefore + 1);
    await textareasAfterAppend.nth(textareasBefore).fill(appendedContent);
    await page.getByRole("button", { name: "Save note changes" }).click();

    await page.waitForURL((url) => url.pathname === "/dashboard" && url.searchParams.get("updated") === "1");
    await expect(page.getByText("Your note changes were saved to the shared thread.")).toBeVisible();
    await expect(page.getByText(appendedContent)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Student threads" })).toHaveCount(0);

    await page.goto(`/dashboard?edit=${noteId}`);
    await page.waitForURL(new RegExp(`/dashboard\\?edit=${noteId}`));
    await expect(page.getByRole("button", { name: "Saved item" })).toHaveCount(savedButtonsBefore + 1);
  } finally {
    if (noteId) {
      await deleteAppendedItem(noteId, appendedContent);
    }
    await context.close();
  }
});
