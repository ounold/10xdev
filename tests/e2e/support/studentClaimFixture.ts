import fs from "node:fs";

interface ClaimFixtureHeaders {
  apikey: string;
  Authorization: string;
  "Content-Type": string;
  Prefer: string;
}

interface ClaimFixtureOptions {
  email: string;
  professorProfileId?: string;
  fullName: string;
}

interface DuplicateClaimFixtureOptions {
  email: string;
  professorProfileId?: string;
  fullNames: [string, string];
}

export const defaultClaimStudentStorageStatePath = ".auth/claim-student.json";
export const defaultClaimStudentMetaPath = ".auth/claim-student.meta.json";

export interface ClaimStudentFixtureMeta {
  email?: string;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function readClaimStudentFixtureMeta() {
  const metaPath = process.env.E2E_CLAIM_STUDENT_META_PATH ?? defaultClaimStudentMetaPath;
  if (!fs.existsSync(metaPath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(metaPath, "utf8")) as ClaimStudentFixtureMeta;
}

function getClaimFixtureEnv() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for student claim fixture prep.");
  }

  return { supabaseUrl, serviceRoleKey };
}

function getHeaders(serviceRoleKey: string): ClaimFixtureHeaders {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "return=minimal",
  };
}

function resolveProfessorProfileId() {
  const explicitProfessorProfileId = process.env.E2E_PROFESSOR_PROFILE_ID?.trim();
  if (explicitProfessorProfileId) {
    return explicitProfessorProfileId;
  }
  throw new Error("E2E_PROFESSOR_PROFILE_ID is required for student claim fixture prep.");
}

async function assertOk(response: Response, fallbackMessage: string) {
  if (response.ok) {
    return;
  }

  const details = await response.text();
  throw new Error(details || fallbackMessage);
}

export async function resetStudentClaimFixture(email: string) {
  const { supabaseUrl, serviceRoleKey } = getClaimFixtureEnv();
  const normalizedEmail = normalizeEmail(email);
  const headers = getHeaders(serviceRoleKey);

  const response = await fetch(`${supabaseUrl}/rest/v1/students?email=eq.${encodeURIComponent(normalizedEmail)}`, {
    method: "DELETE",
    headers,
  });

  await assertOk(response, "Unable to reset student claim fixture rows.");
}

async function insertStudentRows(
  rows: {
    professor_profile_id: string;
    student_profile_id: null;
    full_name: string;
    email: string;
  }[],
) {
  const { supabaseUrl, serviceRoleKey } = getClaimFixtureEnv();
  const response = await fetch(`${supabaseUrl}/rest/v1/students`, {
    method: "POST",
    headers: getHeaders(serviceRoleKey),
    body: JSON.stringify(rows),
  });

  await assertOk(response, "Unable to create student claim fixture rows.");
}

export async function prepareClaimReadyFixture(options: ClaimFixtureOptions) {
  const normalizedEmail = normalizeEmail(options.email);
  const professorProfileId = options.professorProfileId ?? resolveProfessorProfileId();
  await resetStudentClaimFixture(normalizedEmail);
  await insertStudentRows([
    {
      professor_profile_id: professorProfileId,
      student_profile_id: null,
      full_name: options.fullName,
      email: normalizedEmail,
    },
  ]);
}

export async function prepareDuplicateClaimFixture(options: DuplicateClaimFixtureOptions) {
  const normalizedEmail = normalizeEmail(options.email);
  const professorProfileId = options.professorProfileId ?? resolveProfessorProfileId();
  await resetStudentClaimFixture(normalizedEmail);
  await insertStudentRows(
    options.fullNames.map((fullName) => ({
      professor_profile_id: professorProfileId,
      student_profile_id: null,
      full_name: fullName,
      email: normalizedEmail,
    })),
  );
}
