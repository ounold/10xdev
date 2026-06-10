declare namespace App {
  interface Locals {
    user: import("@supabase/supabase-js").User | null;
    profile: import("@/lib/database").ProfileRow | null;
    role: import("@/lib/database").AppRole | null;
    isBootstrapProfessorEmail: boolean;
    hasProfessor: boolean;
    isLinkedStudent: boolean;
    hasArchivedStudentAccess: boolean;
  }
}
