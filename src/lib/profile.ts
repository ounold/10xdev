import { BOOTSTRAP_PROFESSOR_EMAIL } from "astro:env/server";
import type { User } from "@supabase/supabase-js";

import type { AppRole, ProfileRow } from "@/lib/database";
import { createAdminClient } from "@/lib/supabase";

export interface CurrentProfileState {
  profile: ProfileRow | null;
  role: AppRole | null;
  isBootstrapProfessorEmail: boolean;
  hasProfessor: boolean;
  isLinkedStudent: boolean;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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
