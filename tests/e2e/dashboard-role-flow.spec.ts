import { expect, test } from "@playwright/test";

import { signIn } from "./support/auth";
import { getLinkedStudentAccount, getProfessorAccount, getUnlinkedStudentAccount, loadE2EEnv } from "./support/env";

loadE2EEnv();

const linkedStudent = getLinkedStudentAccount();
const professor = getProfessorAccount();
const unlinkedStudent = getUnlinkedStudentAccount();

test("redirects unauthenticated users from /dashboard to sign-in", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/auth\/signin$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("sends an unlinked student to pending access", async ({ page }) => {
  const account = unlinkedStudent;
  test.skip(!account, "Set E2E_UNLINKED_STUDENT_EMAIL and E2E_UNLINKED_STUDENT_PASSWORD to run this check.");
  if (!account) {
    return;
  }

  await signIn(page, account);

  await expect(page).toHaveURL(/\/pending-access$/);
  await expect(page.getByRole("heading", { name: "Your account is ready, but product access is not." })).toBeVisible();
});

test("allows a linked student into the read-only dashboard branch", async ({ page }) => {
  const account = linkedStudent;
  test.skip(!account, "Set E2E_LINKED_STUDENT_EMAIL and E2E_LINKED_STUDENT_PASSWORD to run this check.");
  if (!account) {
    return;
  }

  await signIn(page, account);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Your supervision history" })).toBeVisible();
  await expect(page.getByText("This student dashboard is read-only.")).toBeVisible();
  await expect(page.getByText("Add a student")).toHaveCount(0);
});

test("preserves the professor roster and thread-entry sentinel", async ({ page }) => {
  const account = professor;
  test.skip(!account, "Set E2E_PROFESSOR_EMAIL and E2E_PROFESSOR_PASSWORD to run this check.");
  if (!account) {
    return;
  }

  await signIn(page, account);

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Student threads" })).toBeVisible();

  const threadLinks = page.locator('a[href^="/dashboard/students/"]');
  await expect(threadLinks.first()).toBeVisible();
  await threadLinks.first().click();

  await expect(page).toHaveURL(/\/dashboard\/students\/.+/);
  await expect(page.getByRole("heading", { name: "Chronological history" })).toBeVisible();
});
