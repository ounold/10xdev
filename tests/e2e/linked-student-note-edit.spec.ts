import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";
import { defaultLinkedStudentStorageStatePath } from "./support/linkedStudentFixture";
import { signIn } from "./support/auth";
import { getLinkedStudentAccount, loadE2EEnv } from "./support/env";

loadE2EEnv();

test("linked student can edit their own shared note without seeing professor-only surfaces", async ({
  baseURL,
  browser,
}) => {
  const storageStatePath = process.env.E2E_LINKED_STUDENT_STORAGE_STATE ?? defaultLinkedStudentStorageStatePath;
  const linkedStudentAccount = getLinkedStudentAccount();
  const hasLinkedStudentStorageState = fs.existsSync(storageStatePath);

  test.skip(
    !hasLinkedStudentStorageState && !linkedStudentAccount,
    `Missing usable linked-student auth. Add ${storageStatePath} or set E2E_LINKED_STUDENT_EMAIL and E2E_LINKED_STUDENT_PASSWORD.`,
  );

  const context = await browser.newContext({
    baseURL,
    storageState: hasLinkedStudentStorageState ? path.resolve(storageStatePath) : undefined,
  });
  const page = await context.newPage();
  const editedContent = "info2 linked student verify";
  let originalContent = "";

  try {
    await page.goto("/dashboard");

    if ((await page.getByRole("heading", { name: "Sign in" }).count()) > 0) {
      test.skip(
        !linkedStudentAccount,
        "Linked-student storageState is no longer valid and E2E_LINKED_STUDENT_* credentials are not configured.",
      );
      if (!linkedStudentAccount) {
        return;
      }

      await signIn(page, linkedStudentAccount);
    }

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Your supervision history" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Student threads" })).toHaveCount(0);
    await expect(page.getByText("Add a student")).toHaveCount(0);

    const firstEditLink = page.getByRole("link", { name: "Edit note" }).first();
    await expect(firstEditLink).toBeVisible();
    await firstEditLink.click();

    await page.waitForURL(/\/dashboard\?edit=/);
    await expect(page.getByRole("heading", { name: /Update .* inside your shared thread/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Discard note changes" })).toBeVisible();

    await page.getByRole("link", { name: "Discard note changes" }).click();
    await page.waitForURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Your supervision history" })).toBeVisible();

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
