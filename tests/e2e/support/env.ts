import fs from "node:fs";
import path from "node:path";

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
  return accountFromEnv("E2E_PROFESSOR");
}

export function getLinkedStudentAccount() {
  return accountFromEnv("E2E_LINKED_STUDENT");
}

export function getUnlinkedStudentAccount() {
  return accountFromEnv("E2E_UNLINKED_STUDENT");
}
