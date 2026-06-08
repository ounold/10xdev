import fs from "node:fs";
import path from "node:path";

import { readClaimStudentFixtureMeta } from "./studentClaimFixture";

export interface RoleAccount {
  email: string;
  password: string;
}

const ENV_FILES = [".env", ".dev.vars"];

export function loadE2EEnv() {
  for (const file of ENV_FILES) {
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const separator = line.indexOf("=");
      if (separator === -1) {
        continue;
      }

      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();
      process.env[key] ??= value;
    }
  }
}

function accountFromEnv(prefix: string): RoleAccount | null {
  const email = process.env[`${prefix}_EMAIL`]?.trim();
  const password = process.env[`${prefix}_PASSWORD`]?.trim();

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

export function getProfessorAccount() {
  const explicitAccount = accountFromEnv("E2E_PROFESSOR");
  if (explicitAccount) {
    return explicitAccount;
  }

  const bootstrapEmail = process.env.BOOTSTRAP_PROFESSOR_EMAIL?.trim();
  const fixturePassword = process.env.E2E_FIXTURE_PASSWORD?.trim() ?? "RepoFixture!2026";

  if (!bootstrapEmail) {
    return null;
  }

  return {
    email: bootstrapEmail,
    password: fixturePassword,
  };
}

export function getLinkedStudentAccount() {
  return accountFromEnv("E2E_LINKED_STUDENT");
}

export function getUnlinkedStudentAccount() {
  return accountFromEnv("E2E_UNLINKED_STUDENT");
}

export function getClaimStudentAccount() {
  return accountFromEnv("E2E_CLAIM_STUDENT") ?? getUnlinkedStudentAccount();
}

export function getClaimStudentEmail() {
  return (
    process.env.E2E_CLAIM_STUDENT_EMAIL?.trim() ??
    process.env.E2E_UNLINKED_STUDENT_EMAIL?.trim() ??
    readClaimStudentFixtureMeta().email?.trim() ??
    null
  );
}
