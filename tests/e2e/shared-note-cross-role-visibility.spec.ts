import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { defaultLinkedStudentStorageStatePath, readLinkedStudentFixtureMeta } from "./support/linkedStudentFixture";
import { signIn } from "./support/auth";
import { getLinkedStudentAccount, getProfessorAccount, loadE2EEnv } from "./support/env";

const defaultProfessorStorageStatePath = ".auth/user.json";

loadE2EEnv();

test("professor can see a linked student's shared-note edit in the same thread", async ({ baseURL, browser }) => {
  const linkedStudentStorageStatePath =
    process.env.E2E_LINKED_STUDENT_STORAGE_STATE ?? defaultLinkedStudentStorageStatePath;
  const professorStorageStatePath = process.env.E2E_PROFESSOR_STORAGE_STATE ?? defaultProfessorStorageStatePath;
  const linkedStudentAccount = getLinkedStudentAccount();
  const professorAccount = getProfessorAccount();
  const ownStudentId = process.env.E2E_OWN_STUDENT_ID ?? readLinkedStudentFixtureMeta().ownStudentId;
  const hasLinkedStudentStorageState = fs.existsSync(linkedStudentStorageStatePath);
  const hasProfessorStorageState = fs.existsSync(professorStorageStatePath);

  test.skip(
    !hasLinkedStudentStorageState && !linkedStudentAccount,
    `Missing usable linked-student auth. Add ${linkedStudentStorageStatePath} or set E2E_LINKED_STUDENT_EMAIL and E2E_LINKED_STUDENT_PASSWORD.`,
  );
  test.skip(
    !hasProfessorStorageState && !professorAccount,
    `Missing usable professor auth. Add ${professorStorageStatePath} or set E2E_PROFESSOR_EMAIL and E2E_PROFESSOR_PASSWORD.`,
  );
  test.skip(!ownStudentId, "Set E2E_OWN_STUDENT_ID or provide it through linked student fixture metadata.");

  const studentContext = await browser.newContext({
    baseURL,
    storageState: hasLinkedStudentStorageState ? path.resolve(linkedStudentStorageStatePath) : undefined,
  });
  const professorContext = await browser.newContext({
    baseURL,
    storageState: hasProfessorStorageState ? path.resolve(professorStorageStatePath) : undefined,
  });
  const studentPage = await studentContext.newPage();
  const professorPage = await professorContext.newPage();

  const editedContent = `linked student shared note visible to professor ${Date.now()}`;
  let originalContent = "";
  let noteId: string | null = null;

  try {
    await studentPage.goto("/dashboard");

    if ((await studentPage.getByRole("heading", { name: "Sign in" }).count()) > 0) {
      test.skip(
        !linkedStudentAccount,
        "Linked-student storageState is no longer valid and E2E_LINKED_STUDENT_* credentials are not configured.",
      );
      if (!linkedStudentAccount) {
        return;
      }

      await signIn(studentPage, linkedStudentAccount);
    }

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

    if ((await professorPage.getByRole("heading", { name: "Sign in" }).count()) > 0) {
      test.skip(
        !professorAccount,
        "Professor storageState is no longer valid and E2E_PROFESSOR_* credentials are not configured.",
      );
      if (!professorAccount) {
        return;
      }

      await signIn(professorPage, professorAccount);
      await professorPage.goto(`/dashboard/students/${ownStudentId}?edit=${noteId}`);
    }

    await expect(professorPage).toHaveURL(new RegExp(`/dashboard/students/${ownStudentId}\\?edit=`));
    await expect(professorPage.getByRole("heading", { name: /Update .* inside this thread/ })).toBeVisible();
    await expect(professorPage.getByRole("link", { name: "Discard note changes" })).toBeVisible();
    await professorPage.getByRole("link", { name: "Discard note changes" }).click();
    await professorPage.waitForURL(`/dashboard/students/${ownStudentId}`);
    await expect(professorPage.getByRole("heading", { name: "Chronological history" })).toBeVisible();

    await professorPage.goto(`/dashboard/students/${ownStudentId}?edit=${noteId}`);
    await expect(professorPage).toHaveURL(new RegExp(`/dashboard/students/${ownStudentId}\\?edit=`));
    await expect(professorPage.getByRole("heading", { name: /Update .* inside this thread/ })).toBeVisible();

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
