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

interface ReturningClaimFixtureOptions {
  email: string;
  professorProfileId?: string;
  archivedFullName: string;
  activeFullName: string;
}

interface ReturningDuplicateClaimFixtureOptions {
  email: string;
  professorProfileId?: string;
  archivedFullName: string;
  activeFullNames: [string, string];
}

export const defaultClaimStudentStorageStatePath = ".auth/claim-student.json";
export const defaultClaimStudentMetaPath = ".auth/claim-student.meta.json";

export interface ClaimStudentFixtureMeta {
  email?: string;
  userId?: string;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function resolveArchivedStudentProfileId() {
  const explicitArchivedStudentProfileId = process.env.E2E_CLAIM_STUDENT_PROFILE_ID?.trim();
  if (explicitArchivedStudentProfileId) {
    return explicitArchivedStudentProfileId;
  }

  const fixtureMetaUserId = readClaimStudentFixtureMeta().userId?.trim();
  if (fixtureMetaUserId) {
    return fixtureMetaUserId;
  }

  throw new Error(
    "Returning-student claim fixture prep requires E2E_CLAIM_STUDENT_PROFILE_ID or a userId in the claim-student meta file.",
  );
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

function readProfessorProfileIdFromStorageState() {
  const storageStatePath = process.env.E2E_PROFESSOR_STORAGE_STATE ?? ".auth/user.json";
  if (!fs.existsSync(storageStatePath)) {
    return null;
  }

  const storageState = JSON.parse(fs.readFileSync(storageStatePath, "utf8")) as {
    cookies?: { name?: string; value?: string }[];
  };
  const authCookie = storageState.cookies?.find((cookie) => cookie.name?.includes("auth-token"));
  const encodedValue = authCookie?.value;

  if (!encodedValue?.startsWith("base64-")) {
    return null;
  }

  const decodedValue = Buffer.from(encodedValue.slice("base64-".length), "base64").toString("utf8");
  const parsedValue = JSON.parse(decodedValue) as {
    user?: { id?: string };
  };

  return parsedValue.user?.id?.trim() ?? null;
}

async function resolveProfessorProfileId() {
  const explicitProfessorProfileId = process.env.E2E_PROFESSOR_PROFILE_ID?.trim();
  if (explicitProfessorProfileId) {
    return explicitProfessorProfileId;
  }

  const storageStateProfessorProfileId = readProfessorProfileIdFromStorageState();
  if (storageStateProfessorProfileId) {
    return storageStateProfessorProfileId;
  }

  const professorEmail =
    process.env.E2E_PROFESSOR_EMAIL?.trim().toLowerCase() ??
    process.env.BOOTSTRAP_PROFESSOR_EMAIL?.trim().toLowerCase();
  if (!professorEmail) {
    throw new Error(
      "Student claim fixture prep requires E2E_PROFESSOR_PROFILE_ID, a reusable professor storage state, or E2E_PROFESSOR_EMAIL.",
    );
  }

  const { supabaseUrl, serviceRoleKey } = getClaimFixtureEnv();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=id&role=eq.professor&email=eq.${encodeURIComponent(professorEmail)}&limit=1`,
    {
      headers: getHeaders(serviceRoleKey),
    },
  );

  await assertOk(response, "Unable to resolve professor profile id for student claim fixture prep.");

  const profiles = (await response.json()) as { id: string }[];
  const profileId = profiles[0]?.id?.trim();
  if (!profileId) {
    throw new Error(`Unable to resolve a professor profile id for ${professorEmail}.`);
  }

  return profileId;
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
    student_profile_id: string | null;
    archived_student_profile_id?: string | null;
    lifecycle?: "active" | "archived";
    archived_at?: string | null;
    full_name: string;
    email: string;
  }[],
) {
  const { supabaseUrl, serviceRoleKey } = getClaimFixtureEnv();
  const normalizedRows = rows.map((row) => ({
    professor_profile_id: row.professor_profile_id,
    student_profile_id: row.student_profile_id,
    archived_student_profile_id: row.archived_student_profile_id ?? null,
    lifecycle: row.lifecycle ?? "active",
    archived_at: row.archived_at ?? null,
    full_name: row.full_name,
    email: row.email,
  }));
  const response = await fetch(`${supabaseUrl}/rest/v1/students`, {
    method: "POST",
    headers: getHeaders(serviceRoleKey),
    body: JSON.stringify(normalizedRows),
  });

  await assertOk(response, "Unable to create student claim fixture rows.");
}

export async function prepareClaimReadyFixture(options: ClaimFixtureOptions) {
  const normalizedEmail = normalizeEmail(options.email);
  const professorProfileId = options.professorProfileId ?? (await resolveProfessorProfileId());
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
  const professorProfileId = options.professorProfileId ?? (await resolveProfessorProfileId());
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

export async function prepareReturningClaimFixture(options: ReturningClaimFixtureOptions) {
  const normalizedEmail = normalizeEmail(options.email);
  const professorProfileId = options.professorProfileId ?? (await resolveProfessorProfileId());
  const archivedStudentProfileId = resolveArchivedStudentProfileId();
  await resetStudentClaimFixture(normalizedEmail);
  await insertStudentRows([
    {
      professor_profile_id: professorProfileId,
      student_profile_id: null,
      archived_student_profile_id: archivedStudentProfileId,
      lifecycle: "archived",
      archived_at: "2026-06-11T08:00:00Z",
      full_name: options.archivedFullName,
      email: normalizedEmail,
    },
    {
      professor_profile_id: professorProfileId,
      student_profile_id: null,
      full_name: options.activeFullName,
      email: normalizedEmail,
    },
  ]);
}

export async function prepareReturningDuplicateClaimFixture(options: ReturningDuplicateClaimFixtureOptions) {
  const normalizedEmail = normalizeEmail(options.email);
  const professorProfileId = options.professorProfileId ?? (await resolveProfessorProfileId());
  const archivedStudentProfileId = resolveArchivedStudentProfileId();
  await resetStudentClaimFixture(normalizedEmail);
  await insertStudentRows([
    {
      professor_profile_id: professorProfileId,
      student_profile_id: null,
      archived_student_profile_id: archivedStudentProfileId,
      lifecycle: "archived",
      archived_at: "2026-06-11T08:00:00Z",
      full_name: options.archivedFullName,
      email: normalizedEmail,
    },
    ...options.activeFullNames.map((fullName) => ({
      professor_profile_id: professorProfileId,
      student_profile_id: null,
      full_name: fullName,
      email: normalizedEmail,
    })),
  ]);
}
