import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  prepareArchivedStudentHistoryFixture,
  resetArchivedStudentHistoryFixture,
} from "./support/archivedStudentHistoryFixture";
import { readLinkedStudentFixtureMeta } from "./support/linkedStudentFixture";
import { signIn } from "./support/auth";
import { getProfessorAccount, loadE2EEnv } from "./support/env";

const defaultProfessorStorageStatePath = ".auth/user.json";

loadE2EEnv();

test("professor can open archived history from the archive roster in read-only mode", async ({ baseURL, browser }) => {
  const professorStorageStatePath = process.env.E2E_PROFESSOR_STORAGE_STATE ?? defaultProfessorStorageStatePath;
  const professorAccount = getProfessorAccount();
  const hasExplicitProfessorCredentials = Boolean(
    process.env.E2E_PROFESSOR_EMAIL?.trim() && process.env.E2E_PROFESSOR_PASSWORD?.trim(),
  );
  const hasProfessorStorageState = fs.existsSync(professorStorageStatePath);
  const linkedStudentMeta = readLinkedStudentFixtureMeta();
  const archivedStudentProfileId = linkedStudentMeta.studentProfileId?.trim();

  test.skip(
    !hasProfessorStorageState && !professorAccount,
    `Missing usable professor auth. Add ${professorStorageStatePath} or set E2E_PROFESSOR_EMAIL and E2E_PROFESSOR_PASSWORD.`,
  );
  test.skip(
    !archivedStudentProfileId,
    "Missing linked-student fixture metadata with studentProfileId for archived-history prep.",
  );

  const fixture = await prepareArchivedStudentHistoryFixture({
    fullName: "Archived E2E Student",
    email: "archived-e2e-student@example.com",
    archivedStudentProfileId,
  });

  const context = await browser.newContext({
    baseURL,
    storageState: hasProfessorStorageState ? path.resolve(professorStorageStatePath) : undefined,
  });
  const page = await context.newPage();

  try {
    await page.goto("/dashboard?roster=archived");

    if ((await page.getByRole("heading", { name: "Sign in" }).count()) > 0) {
      test.skip(
        !hasExplicitProfessorCredentials,
        "Professor storageState is no longer valid and explicit E2E_PROFESSOR_* credentials are not configured.",
      );
      if (!hasExplicitProfessorCredentials || !professorAccount) {
        return;
      }

      await signIn(page, professorAccount);
      await page.goto("/dashboard?roster=archived");
    }

    await expect(page.getByRole("heading", { name: "Student threads" })).toBeVisible();
    await expect(page.getByText("Archived student threads")).toBeVisible();
    const rosterSwitch = page.locator("div.inline-flex.rounded-full").first();
    await expect(rosterSwitch.getByRole("link", { name: "Active" })).toBeVisible();
    await expect(rosterSwitch.getByRole("link", { name: "Archived", exact: true })).toBeVisible();

    const archivedThreadLink = page.getByRole("link", { name: /Archived E2E Student/ }).first();

    await expect(archivedThreadLink).toBeVisible();
    await expect(archivedThreadLink).toContainText("Archived E2E Student");
    await expect(archivedThreadLink).toContainText("Archived");
    await expect(archivedThreadLink).toContainText("Professor-only history");

    await archivedThreadLink.click();

    await page.waitForURL(
      (url) =>
        url.pathname === `/dashboard/students/${fixture.studentId}` && url.searchParams.get("roster") === "archived",
    );

    await expect(page.getByRole("heading", { name: "Read-only supervision history" })).toBeVisible();
    await expect(page.getByText("Read-only archive")).toBeVisible();
    await expect(page.getByText("Archived continuity note for professor-only history review.")).toBeVisible();
    await expect(page.getByText("Archived follow-up that should stay read-only.")).toBeVisible();
    await expect(page.getByText(/Completed by Professor on/)).toBeVisible();
    await expect(page.getByText("Read-only note")).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit note" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Mark done" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reopen task" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Capture the next supervision update" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Archive this student" })).toHaveCount(0);

    await page.getByRole("link", { name: "Back to archived student threads" }).click();
    await page.waitForURL((url) => url.pathname === "/dashboard" && url.searchParams.get("roster") === "archived");
    await expect(page.getByText("Archived student threads")).toBeVisible();
  } finally {
    await context.close();
    await resetArchivedStudentHistoryFixture(fixture.email);
  }
});
