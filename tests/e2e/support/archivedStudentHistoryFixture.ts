import fs from "node:fs";

interface ArchivedStudentHistoryHeaders {
  apikey: string;
  Authorization: string;
  "Content-Type": string;
  Prefer: string;
}

interface ArchivedStudentHistoryFixtureOptions {
  fullName: string;
  email: string;
  professorProfileId?: string;
  archivedStudentProfileId?: string;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getArchivedHistoryFixtureEnv() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for archived-history fixture prep.");
  }

  return { supabaseUrl, serviceRoleKey };
}

function getHeaders(serviceRoleKey: string): ArchivedStudentHistoryHeaders {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
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

function resolveProfessorProfileId() {
  const explicitProfessorProfileId = process.env.E2E_PROFESSOR_PROFILE_ID?.trim();
  if (explicitProfessorProfileId) {
    return explicitProfessorProfileId;
  }

  const storageStateProfessorProfileId = readProfessorProfileIdFromStorageState();
  if (storageStateProfessorProfileId) {
    return storageStateProfessorProfileId;
  }

  throw new Error("E2E_PROFESSOR_PROFILE_ID is required for archived-history fixture prep.");
}

async function assertOk(response: Response, fallbackMessage: string) {
  if (response.ok) {
    return;
  }

  const details = await response.text();
  throw new Error(details || fallbackMessage);
}

export async function resetArchivedStudentHistoryFixture(email: string) {
  const { supabaseUrl, serviceRoleKey } = getArchivedHistoryFixtureEnv();
  const normalizedEmail = normalizeEmail(email);

  const studentsResponse = await fetch(
    `${supabaseUrl}/rest/v1/students?select=id&email=eq.${encodeURIComponent(normalizedEmail)}`,
    {
      headers: getHeaders(serviceRoleKey),
    },
  );

  await assertOk(studentsResponse, "Unable to read archived-history fixture students.");

  const students = (await studentsResponse.json()) as { id: string }[];
  const studentIds = students.map((student) => student.id);

  if (studentIds.length > 0) {
    const joinedIds = studentIds.map((id) => `"${id}"`).join(",");

    const notesResponse = await fetch(`${supabaseUrl}/rest/v1/notes?student_id=in.(${encodeURIComponent(joinedIds)})`, {
      method: "DELETE",
      headers: getHeaders(serviceRoleKey),
    });

    await assertOk(notesResponse, "Unable to delete archived-history fixture notes.");
  }

  const studentsDeleteResponse = await fetch(
    `${supabaseUrl}/rest/v1/students?email=eq.${encodeURIComponent(normalizedEmail)}`,
    {
      method: "DELETE",
      headers: getHeaders(serviceRoleKey),
    },
  );

  await assertOk(studentsDeleteResponse, "Unable to delete archived-history fixture students.");
}

export async function prepareArchivedStudentHistoryFixture(options: ArchivedStudentHistoryFixtureOptions) {
  const { supabaseUrl, serviceRoleKey } = getArchivedHistoryFixtureEnv();
  const professorProfileId = options.professorProfileId ?? resolveProfessorProfileId();
  const archivedStudentProfileId = options.archivedStudentProfileId?.trim();

  if (!archivedStudentProfileId) {
    throw new Error("An archived student profile id is required for archived-history fixture prep.");
  }

  const normalizedEmail = normalizeEmail(options.email);
  await resetArchivedStudentHistoryFixture(normalizedEmail);

  const archivedAt = new Date().toISOString();
  const studentResponse = await fetch(`${supabaseUrl}/rest/v1/students`, {
    method: "POST",
    headers: getHeaders(serviceRoleKey),
    body: JSON.stringify([
      {
        professor_profile_id: professorProfileId,
        student_profile_id: null,
        archived_student_profile_id: archivedStudentProfileId,
        lifecycle: "archived",
        archived_at: archivedAt,
        full_name: options.fullName,
        email: normalizedEmail,
      },
    ]),
  });

  await assertOk(studentResponse, "Unable to create archived-history fixture student.");

  const [student] = (await studentResponse.json()) as { id: string }[];
  const noteResponse = await fetch(`${supabaseUrl}/rest/v1/notes`, {
    method: "POST",
    headers: getHeaders(serviceRoleKey),
    body: JSON.stringify([
      {
        student_id: student.id,
        meeting_date: "2026-06-01",
        created_by: professorProfileId,
        updated_by: professorProfileId,
      },
    ]),
  });

  await assertOk(noteResponse, "Unable to create archived-history fixture note.");

  const [note] = (await noteResponse.json()) as { id: string }[];
  const noteItemsResponse = await fetch(`${supabaseUrl}/rest/v1/note_items`, {
    method: "POST",
    headers: getHeaders(serviceRoleKey),
    body: JSON.stringify([
      {
        note_id: note.id,
        position: 1,
        item_type: "info",
        content: "Archived continuity note for professor-only history review.",
        completed_at: null,
        completed_by: null,
      },
      {
        note_id: note.id,
        position: 2,
        item_type: "task",
        content: "Archived follow-up that should stay read-only.",
        completed_at: archivedAt,
        completed_by: professorProfileId,
      },
    ]),
  });

  await assertOk(noteItemsResponse, "Unable to create archived-history fixture note items.");

  return {
    studentId: student.id,
    email: normalizedEmail,
  };
}
