import fs from "node:fs";
import path from "node:path";

import type { Browser, BrowserContext, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { signIn } from "./support/auth";
import { getClaimStudentAccount, getClaimStudentEmail, loadE2EEnv } from "./support/env";
import {
  defaultClaimStudentStorageStatePath,
  prepareClaimReadyFixture,
  prepareDuplicateClaimFixture,
  resetStudentClaimFixture,
} from "./support/studentClaimFixture";

loadE2EEnv();

async function createClaimStudentContext(
  browser: Browser,
  baseURL: string | undefined,
): Promise<{ context: BrowserContext; page: Page }> {
  const storageStatePath = process.env.E2E_CLAIM_STUDENT_STORAGE_STATE ?? defaultClaimStudentStorageStatePath;
  if (fs.existsSync(storageStatePath)) {
    const context = await browser.newContext({
      baseURL,
      storageState: path.resolve(storageStatePath),
    });

    return {
      context,
      page: await context.newPage(),
    };
  }

  const account = getClaimStudentAccount();
  test.skip(
    !account,
    `Missing claim-student auth fixture: provide ${storageStatePath} or set E2E_CLAIM_STUDENT_* / E2E_UNLINKED_STUDENT_* credentials.`,
  );

  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();
  await signIn(page, account);

  return { context, page };
}

test.describe("student claim flow", () => {
  test("claim-ready student can link access from pending-access and reach the dashboard", async ({
    baseURL,
    browser,
  }) => {
    const claimStudentEmail = getClaimStudentEmail();
    test.skip(!claimStudentEmail, "Set E2E_CLAIM_STUDENT_EMAIL or E2E_UNLINKED_STUDENT_EMAIL for claim-flow E2E.");

    await prepareClaimReadyFixture({
      email: claimStudentEmail,
      fullName: "Claim Ready Student",
    });

    const { context, page } = await createClaimStudentContext(browser, baseURL);

    try {
      await page.goto("/dashboard");

      await expect(page).toHaveURL(/\/pending-access$/);
      await expect(
        page.getByRole("heading", { name: "Your account is ready, but product access is not." }),
      ).toBeVisible();
      await expect(page.getByText(/prepared a student record for this email/i)).toBeVisible();
      await expect(page.getByRole("button", { name: "Link my student access" })).toBeVisible();

      await page.getByRole("button", { name: "Link my student access" }).click();

      await page.waitForURL((url) => url.pathname === "/dashboard" && url.searchParams.get("claimReady") === "1");
      await expect(page.getByRole("heading", { name: "Your supervision history" })).toBeVisible();
      await expect(page.getByText(/stays limited to the linked student's own supervision history/i)).toBeVisible();
      await expect(page.getByText("Add a student")).toHaveCount(0);
    } finally {
      await resetStudentClaimFixture(claimStudentEmail);
      await context.close();
    }
  });

  test("duplicate-email student stays blocked on pending-access and the app does not choose automatically", async ({
    baseURL,
    browser,
  }) => {
    const claimStudentEmail = getClaimStudentEmail();
    test.skip(!claimStudentEmail, "Set E2E_CLAIM_STUDENT_EMAIL or E2E_UNLINKED_STUDENT_EMAIL for claim-flow E2E.");

    await prepareDuplicateClaimFixture({
      email: claimStudentEmail,
      fullNames: ["Duplicate Student One", "Duplicate Student Two"],
    });

    const { context, page } = await createClaimStudentContext(browser, baseURL);

    try {
      await page.goto("/dashboard");

      await expect(page).toHaveURL(/\/pending-access$/);
      await expect(
        page.getByRole("heading", { name: "Your account is ready, but product access is not." }),
      ).toBeVisible();
      await expect(page.getByText(/more than one prepared student record/i)).toBeVisible();
      await expect(page.getByText(/will not choose one automatically/i)).toBeVisible();
      await expect(page.getByRole("button", { name: "Link my student access" })).toHaveCount(0);
    } finally {
      await resetStudentClaimFixture(claimStudentEmail);
      await context.close();
    }
  });
});
