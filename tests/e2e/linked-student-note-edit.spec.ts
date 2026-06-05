import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";
import { defaultLinkedStudentStorageStatePath } from "./support/linkedStudentFixture";

test("linked student can edit their own shared note without seeing professor-only surfaces", async ({
  baseURL,
  browser,
}) => {
  const storageStatePath = process.env.E2E_LINKED_STUDENT_STORAGE_STATE ?? defaultLinkedStudentStorageStatePath;

  test.skip(!fs.existsSync(storageStatePath), `Missing storageState fixture: ${storageStatePath}`);

  const context = await browser.newContext({
    baseURL,
    storageState: path.resolve(storageStatePath),
  });
  const page = await context.newPage();
  const editedContent = "info2 linked student verify";
  let originalContent = "";

  try {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Your supervision history" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Student threads" })).toHaveCount(0);
    await expect(page.getByText("Add a student")).toHaveCount(0);

    const firstEditLink = page.getByRole("link", { name: "Edit note" }).first();
    await expect(firstEditLink).toBeVisible();
    await firstEditLink.click();

    await page.waitForURL(/\/dashboard\?edit=/);
    await expect(page.getByRole("heading", { name: /Update .* inside your shared thread/ })).toBeVisible();

    const meetingDateInput = page.getByLabel("Meeting date");
    await expect(meetingDateInput).toBeDisabled();
    await expect(page.getByRole("button", { name: "Saved item" }).first()).toBeVisible();
    await expect(page.getByText(/Student threads/)).toHaveCount(0);

    const firstTextarea = page.locator("textarea").first();
    originalContent = await firstTextarea.inputValue();
    await firstTextarea.fill(editedContent);
    await page.getByRole("button", { name: "Save note changes" }).click();

    await page.waitForURL((url) => url.pathname === "/dashboard" && url.searchParams.get("updated") === "1");
    await expect(page.getByText("Your note changes were saved to the shared thread.")).toBeVisible();
    await expect(page.getByText(editedContent)).toBeVisible();
    await expect(page.getByText(/Last edited by .* on/).first()).toBeVisible();

    await page.getByRole("link", { name: "Edit note" }).first().click();
    await page.waitForURL(/\/dashboard\?edit=/);
    await firstTextarea.fill(originalContent);
    await page.getByRole("button", { name: "Save note changes" }).click();
    await page.waitForURL((url) => url.pathname === "/dashboard" && url.searchParams.get("updated") === "1");
    await expect(page.getByText(originalContent)).toBeVisible();
  } finally {
    await context.close();
  }
});
