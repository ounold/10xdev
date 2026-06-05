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

test("linked student can toggle completion on an accessible shared task", async ({ baseURL, browser }) => {
  const storageStatePath = process.env.E2E_LINKED_STUDENT_STORAGE_STATE ?? defaultLinkedStudentStorageStatePath;

  test.skip(!fs.existsSync(storageStatePath), `Missing storageState fixture: ${storageStatePath}`);

  const context = await browser.newContext({
    baseURL,
    storageState: path.resolve(storageStatePath),
  });
  const page = await context.newPage();
  const appendedContent = `linked student completion task ${Date.now()}`;
  let noteId: string | null = null;
  let createdTask = false;

  try {
    await page.goto("/dashboard");

    await expect(page.getByRole("heading", { name: "Your supervision history" })).toBeVisible();

    let taskCard = page
      .locator("li.rounded-xl")
      .filter({ has: page.getByRole("button", { name: /Mark done|Reopen task/ }) })
      .first();

    if ((await taskCard.count()) === 0) {
      const noteEditLinks = page.getByRole("link", { name: "Edit note" });
      await expect(noteEditLinks.last()).toBeVisible();
      await noteEditLinks.last().click();

      await page.waitForURL(/\/dashboard\?edit=/);
      noteId = new URL(page.url()).searchParams.get("edit");
      await page.getByRole("button", { name: "Add task" }).click();
      const textareas = page.locator("textarea");
      const newIndex = (await textareas.count()) - 1;
      await textareas.nth(newIndex).fill(appendedContent);
      await page.getByRole("button", { name: "Save note changes" }).click();
      await page.waitForURL((url) => url.pathname === "/dashboard" && url.searchParams.get("updated") === "1");
      await expect(page.getByText(appendedContent)).toBeVisible();
      createdTask = true;

      taskCard = page
        .locator("li.rounded-xl")
        .filter({ has: page.getByText(appendedContent) })
        .filter({ has: page.getByRole("button", { name: /Mark done|Reopen task/ }) })
        .first();
    }

    await expect(taskCard).toBeVisible();
    const actionButton = taskCard.getByRole("button", { name: /Mark done|Reopen task/ });
    const startingLabel = (await actionButton.textContent())?.trim() ?? "";
    const startsCompleted = startingLabel === "Reopen task";

    await actionButton.click();

    if (startsCompleted) {
      await page.waitForURL(
        (url) => url.pathname === "/dashboard" && url.searchParams.get("taskUpdated") === "incomplete",
      );
      await expect(page.getByText("The task was reopened in the shared thread.")).toBeVisible();
      await expect(taskCard.getByRole("button", { name: "Mark done" })).toBeVisible();
      await expect(taskCard.getByText(/Completed by /)).toHaveCount(0);
      await taskCard.getByRole("button", { name: "Mark done" }).click();
      await page.waitForURL(
        (url) => url.pathname === "/dashboard" && url.searchParams.get("taskUpdated") === "complete",
      );
      await expect(page.getByText("The task was marked as completed in the shared thread.")).toBeVisible();
      await expect(taskCard.getByRole("button", { name: "Reopen task" })).toBeVisible();
      await expect(taskCard.getByText(/Completed by /)).toBeVisible();
    } else {
      await page.waitForURL(
        (url) => url.pathname === "/dashboard" && url.searchParams.get("taskUpdated") === "complete",
      );
      await expect(page.getByText("The task was marked as completed in the shared thread.")).toBeVisible();
      await expect(taskCard.getByRole("button", { name: "Reopen task" })).toBeVisible();
      await expect(taskCard.getByText(/Completed by /)).toBeVisible();
      await taskCard.getByRole("button", { name: "Reopen task" }).click();
      await page.waitForURL(
        (url) => url.pathname === "/dashboard" && url.searchParams.get("taskUpdated") === "incomplete",
      );
      await expect(page.getByText("The task was reopened in the shared thread.")).toBeVisible();
      await expect(taskCard.getByRole("button", { name: "Mark done" })).toBeVisible();
      await expect(taskCard.getByText(/Completed by /)).toHaveCount(0);
    }

    await expect(page.getByRole("heading", { name: "Student threads" })).toHaveCount(0);
    await expect(page.getByText("Add a student")).toHaveCount(0);
  } finally {
    if (noteId && createdTask) {
      await deleteAppendedItem(noteId, appendedContent);
    }
    await context.close();
  }
});
