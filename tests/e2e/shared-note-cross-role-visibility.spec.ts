import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { defaultLinkedStudentStorageStatePath, readLinkedStudentFixtureMeta } from "./support/linkedStudentFixture";

const defaultProfessorStorageStatePath = ".auth/user.json";

test("professor can see a linked student's shared-note edit in the same thread", async ({ baseURL, browser }) => {
  const linkedStudentStorageStatePath =
    process.env.E2E_LINKED_STUDENT_STORAGE_STATE ?? defaultLinkedStudentStorageStatePath;
  const professorStorageStatePath = process.env.E2E_PROFESSOR_STORAGE_STATE ?? defaultProfessorStorageStatePath;
  const ownStudentId = process.env.E2E_OWN_STUDENT_ID ?? readLinkedStudentFixtureMeta().ownStudentId;

  test.skip(
    !fs.existsSync(linkedStudentStorageStatePath),
    `Missing storageState fixture: ${linkedStudentStorageStatePath}`,
  );
  test.skip(!fs.existsSync(professorStorageStatePath), `Missing storageState fixture: ${professorStorageStatePath}`);
  test.skip(!ownStudentId, "Set E2E_OWN_STUDENT_ID or provide it through linked student fixture metadata.");

  const studentContext = await browser.newContext({
    baseURL,
    storageState: path.resolve(linkedStudentStorageStatePath),
  });
  const professorContext = await browser.newContext({
    baseURL,
    storageState: path.resolve(professorStorageStatePath),
  });
  const studentPage = await studentContext.newPage();
  const professorPage = await professorContext.newPage();

  const editedContent = `linked student shared note visible to professor ${Date.now()}`;
  let originalContent = "";
  let noteId: string | null = null;

  try {
    await studentPage.goto("/dashboard");
    await expect(studentPage).toHaveURL(/\/dashboard$/);

    const firstEditLink = studentPage.getByRole("link", { name: "Edit note" }).first();
    await expect(firstEditLink).toBeVisible();
    await firstEditLink.click();

    await studentPage.waitForURL(/\/dashboard\?edit=/);
    noteId = new URL(studentPage.url()).searchParams.get("edit");
    expect(noteId).toBeTruthy();

    const firstTextarea = studentPage.locator("textarea").first();
    const serializedItemsInput = studentPage.locator('input[name="itemsPayload"]');
    originalContent = await firstTextarea.inputValue();
    await firstTextarea.fill(editedContent);
    await expect(firstTextarea).toHaveValue(editedContent);
    await expect(serializedItemsInput).toHaveValue(new RegExp(editedContent));
    await studentPage.getByRole("button", { name: "Save note changes" }).click();

    await studentPage.waitForURL((url) => url.pathname === "/dashboard" && url.searchParams.get("updated") === "1");
    await expect(studentPage.getByText("Your note changes were saved to the shared thread.")).toBeVisible();
    await expect(studentPage.getByText(editedContent)).toBeVisible();

    await professorPage.goto(`/dashboard/students/${ownStudentId}?edit=${noteId}`);
    await expect(professorPage).toHaveURL(new RegExp(`/dashboard/students/${ownStudentId}\\?edit=`));
    await expect(professorPage.getByRole("heading", { name: /Update .* without rewriting the thread/ })).toBeVisible();

    const noteCard = professorPage.getByRole("listitem").filter({ hasText: editedContent }).first();
    await expect(noteCard).toContainText(editedContent);
    await expect(noteCard.getByText(/Last edited by .* on/)).toBeVisible();
  } finally {
    if (noteId && originalContent) {
      await studentPage.goto(`/dashboard?edit=${noteId}`);
      await studentPage.waitForURL(new RegExp(`/dashboard\\?edit=${noteId}`));
      const firstTextarea = studentPage.locator("textarea").first();
      const serializedItemsInput = studentPage.locator('input[name="itemsPayload"]');
      await firstTextarea.fill(originalContent);
      await expect(firstTextarea).toHaveValue(originalContent);
      await expect(serializedItemsInput).toHaveValue(new RegExp(originalContent));
      await studentPage.getByRole("button", { name: "Save note changes" }).click();
      await studentPage.waitForURL((url) => url.pathname === "/dashboard" && url.searchParams.get("updated") === "1");
      await expect(studentPage.getByText(originalContent)).toBeVisible();
    }

    await professorContext.close();
    await studentContext.close();
  }
});
