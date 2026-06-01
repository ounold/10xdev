import type { Page } from "@playwright/test";

import type { RoleAccount } from "./env";

export async function signIn(page: Page, account: RoleAccount) {
  await page.goto("/auth/signin");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(account.password);
  await page.getByRole("button", { name: "Sign in" }).click();
}
