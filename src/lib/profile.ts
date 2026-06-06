import { BOOTSTRAP_PROFESSOR_EMAIL } from "astro:env/server";
import type { User } from "@supabase/supabase-js";

import type { AppRole, ProfileRow, StudentLinkClaimability, StudentRow } from "@/lib/database";
import { createAdminClient } from "@/lib/supabase";

export interface CurrentProfileState {
  profile: ProfileRow | null;
  role: AppRole | null;
  isBootstrapProfessorEmail: boolean;
  hasProfessor: boolean;
  isLinkedStudent: boolean;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function toClaimTarget(student: StudentRow) {
  if (!student.email) {
    return null;
  }

  return {
    student_id: student.id,
    full_name: student.full_name,
    email: normalizeEmail(student.email),
  };
}

export function getBootstrapProfessorEmail() {
  if (!BOOTSTRAP_PROFESSOR_EMAIL) {
    throw new Error("BOOTSTRAP_PROFESSOR_EMAIL is required for professor bootstrap");
  }

  const normalizedEmail = normalizeEmail(BOOTSTRAP_PROFESSOR_EMAIL);
  if (!normalizedEmail.includes("@")) {
    throw new Error("BOOTSTRAP_PROFESSOR_EMAIL must be a valid email address");
  }

  return normalizedEmail;
}

export function isBootstrapProfessorEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return normalizeEmail(email) === getBootstrapProfessorEmail();
}

export async function loadCurrentProfileState(user: User): Promise<CurrentProfileState> {
  const adminClient = createAdminClient();
  if (!adminClient) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for professor bootstrap");
  }

  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("id, role, display_name, created_at, updated_at")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  const hasProfessor = await professorExists();
  const { data: studentLink, error: studentLinkError } = await adminClient
    .from("students")
    .select("id")
    .eq("student_profile_id", user.id)
    .limit(1);

  if (studentLinkError) {
    throw studentLinkError;
  }

  return {
    profile,
    role: profile?.role ?? null,
    isBootstrapProfessorEmail: isBootstrapProfessorEmail(user.email),
    hasProfessor,
    isLinkedStudent: studentLink.length > 0,
  };
}

export async function professorExists() {
  const adminClient = createAdminClient();
  if (!adminClient) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for professor bootstrap");
  }

  const { data, error } = await adminClient.from("profiles").select("id").eq("role", "professor").limit(1);
  if (error) {
    throw error;
  }

  return data.length > 0;
}

export async function getStudentLinkClaimabilityForUser(user: User): Promise<StudentLinkClaimability> {
  const adminClient = createAdminClient();
  if (!adminClient) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for student account linking");
  }

  if (!user.email) {
    return {
      status: "missing-email",
      normalized_email: null,
      target: null,
      conflict_count: 0,
    };
  }

  const normalizedEmail = normalizeEmail(user.email);

  const { data: existingLink, error: existingLinkError } = await adminClient
    .from("students")
    .select("id, professor_profile_id, student_profile_id, full_name, email, created_at, updated_at")
    .eq("student_profile_id", user.id)
    .maybeSingle<StudentRow>();

  if (existingLinkError) {
    throw existingLinkError;
  }

  if (existingLink) {
    return {
      status: "already-linked",
      normalized_email: normalizedEmail,
      target: toClaimTarget(existingLink),
      conflict_count: 0,
    };
  }

  const { data: matchingStudents, error: matchingStudentsError } = await adminClient
    .from("students")
    .select("id, professor_profile_id, student_profile_id, full_name, email, created_at, updated_at")
    .eq("email", normalizedEmail)
    .is("student_profile_id", null)
    .overrideTypes<StudentRow[], { merge: false }>();

  if (matchingStudentsError) {
    throw matchingStudentsError;
  }

  if (matchingStudents.length === 0) {
    return {
      status: "missing-match",
      normalized_email: normalizedEmail,
      target: null,
      conflict_count: 0,
    };
  }

  if (matchingStudents.length > 1) {
    return {
      status: "ambiguous-match",
      normalized_email: normalizedEmail,
      target: null,
      conflict_count: matchingStudents.length,
    };
  }

  const [match] = matchingStudents;
  const target = toClaimTarget(match);
  if (!target) {
    return {
      status: "missing-match",
      normalized_email: normalizedEmail,
      target: null,
      conflict_count: 0,
    };
  }

  return {
    status: "claimable",
    normalized_email: normalizedEmail,
    target,
    conflict_count: 1,
  };
}

export async function claimProfessorRoleForUser(user: User) {
  const adminClient = createAdminClient();
  if (!adminClient) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for professor bootstrap");
  }

  if (!isBootstrapProfessorEmail(user.email)) {
    return { claimed: false, reason: "email-not-allowlisted" as const };
  }

  if (await professorExists()) {
    return { claimed: false, reason: "professor-already-exists" as const };
  }

  const { data: existingProfile, error: existingProfileError } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle<{ id: string; role: AppRole }>();

  if (existingProfileError) {
    throw existingProfileError;
  }

  if (!existingProfile) {
    return { claimed: false, reason: "profile-not-found" as const };
  }

  if (existingProfile.role === "professor") {
    return { claimed: true, reason: "already-professor" as const };
  }

  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ role: "professor" })
    .eq("id", user.id)
    .eq("role", "student");

  if (updateError) {
    throw updateError;
  }

  return { claimed: true, reason: "claimed" as const };
}
