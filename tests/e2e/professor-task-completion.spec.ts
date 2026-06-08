import fs from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { signIn } from "./support/auth";
import { getProfessorAccount, loadE2EEnv } from "./support/env";

const defaultProfessorStorageStatePath = ".auth/user.json";

loadE2EEnv();

test("professor can toggle completion on an existing shared task", async ({ baseURL, browser }) => {
  const professorStorageStatePath = process.env.E2E_PROFESSOR_STORAGE_STATE ?? defaultProfessorStorageStatePath;
  const professorAccount = getProfessorAccount();
  const hasProfessorStorageState = fs.existsSync(professorStorageStatePath);

  test.skip(
    !hasProfessorStorageState && !professorAccount,
    `Missing usable professor auth. Add ${professorStorageStatePath} or set E2E_PROFESSOR_EMAIL and E2E_PROFESSOR_PASSWORD.`,
  );

  const context = await browser.newContext({
    baseURL,
    storageState: hasProfessorStorageState ? path.resolve(professorStorageStatePath) : undefined,
  });
  const page = await context.newPage();
  let cleanupAction: "complete" | "incomplete" | null = null;
  let cleanupStudentId: string | null = null;
  let cleanupTaskCardText: string | null = null;

  try {
    await page.goto("/dashboard");

    if ((await page.getByRole("heading", { name: "Sign in" }).count()) > 0) {
      test.skip(
        !professorAccount,
        "Professor storageState is no longer valid and E2E_PROFESSOR_* credentials are not configured.",
      );
      if (!professorAccount) {
        return;
      }

      await signIn(page, professorAccount);
    }

    await expect(page.getByRole("heading", { name: "Student threads" })).toBeVisible();

    const threadLinks = page.locator('a[href^="/dashboard/students/"]');
    const threadHrefs = await threadLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")).filter((href): href is string => Boolean(href)),
    );

    let resolved = false;

    for (const href of threadHrefs) {
      const studentId = /\/dashboard\/students\/([^/?]+)/.exec(href)?.[1] ?? null;

      if (!studentId) {
        continue;
      }

      await page.goto(href);
      await expect(page).toHaveURL(new RegExp(`/dashboard/students/${studentId}$`));

      const taskCard = page
        .locator("li.rounded-xl")
        .filter({ has: page.getByRole("button", { name: /Mark done|Reopen task/ }) })
        .first();

      if ((await taskCard.count()) === 0) {
        continue;
      }

      const actionButton = taskCard.getByRole("button", { name: /Mark done|Reopen task/ });
      const taskCardText = ((await taskCard.textContent()) ?? "").trim();
      const startingLabel = ((await actionButton.textContent()) ?? "").trim();
      const startsCompleted = startingLabel === "Reopen task";

      cleanupAction = startsCompleted ? "complete" : "incomplete";
      cleanupStudentId = studentId;
      cleanupTaskCardText = taskCardText;

      await actionButton.click();

      if (startsCompleted) {
        await page.waitForURL(
          (url) =>
            url.pathname === `/dashboard/students/${studentId}` && url.searchParams.get("taskUpdated") === "incomplete",
        );
        await expect(page.getByText("The task was reopened in this thread.")).toBeVisible();
        await expect(taskCard.getByRole("button", { name: "Mark done" })).toBeVisible();
        await expect(taskCard.getByText(/Completed by /)).toHaveCount(0);
      } else {
        await page.waitForURL(
          (url) =>
            url.pathname === `/dashboard/students/${studentId}` && url.searchParams.get("taskUpdated") === "complete",
        );
        await expect(page.getByText("The task was marked as completed in this thread.")).toBeVisible();
        await expect(taskCard.getByRole("button", { name: "Reopen task" })).toBeVisible();
        await expect(taskCard.getByText(/Completed by Professor on/)).toBeVisible();
      }

      resolved = true;
      break;
    }

    expect(resolved).toBe(true);
  } finally {
    if (cleanupAction && cleanupStudentId) {
      await page.goto(`/dashboard/students/${cleanupStudentId}`);
      await page.waitForURL(new RegExp(`/dashboard/students/${cleanupStudentId}$`));

      const matchingTaskCard = cleanupTaskCardText
        ? page.locator("li.rounded-xl").filter({ hasText: cleanupTaskCardText }).first()
        : page
            .locator("li.rounded-xl")
            .filter({ has: page.getByRole("button", { name: /Mark done|Reopen task/ }) })
            .first();
      const cleanupButton = matchingTaskCard.getByRole("button", {
        name: cleanupAction === "complete" ? "Mark done" : "Reopen task",
      });

      if ((await cleanupButton.count()) > 0) {
        await cleanupButton.click();
        await page.waitForURL(
          (url) =>
            url.pathname === `/dashboard/students/${cleanupStudentId}` &&
            url.searchParams.get("taskUpdated") === cleanupAction,
        );
      }
    }

    await context.close();
  }
});
