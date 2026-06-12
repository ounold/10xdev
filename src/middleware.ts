import { defineMiddleware } from "astro:middleware";
import { loadCurrentProfileState } from "@/lib/profile";
import { createClient } from "@/lib/supabase";

const PROTECTED_ROUTES = ["/dashboard"];
const PENDING_ACCESS_ROUTE = "/pending-access";
const BOOTSTRAP_ROUTE = "/api/bootstrap/professor";
const PROFESSOR_ONLY_DASHBOARD_ROUTE = "/dashboard/students/";

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createClient(context.request.headers, context.cookies);

  context.locals.user = null;
  context.locals.profile = null;
  context.locals.role = null;
  context.locals.isBootstrapProfessorEmail = false;
  context.locals.hasProfessor = false;
  context.locals.isLinkedStudent = false;
  context.locals.hasArchivedStudentAccess = false;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    context.locals.user = user ?? null;

    if (user) {
      const profileState = await loadCurrentProfileState(user);
      context.locals.profile = profileState.profile;
      context.locals.role = profileState.role;
      context.locals.isBootstrapProfessorEmail = profileState.isBootstrapProfessorEmail;
      context.locals.hasProfessor = profileState.hasProfessor;
      context.locals.isLinkedStudent = profileState.isLinkedStudent;
      context.locals.hasArchivedStudentAccess = profileState.hasArchivedStudentAccess;
    }
  }

  if (PROTECTED_ROUTES.some((route) => context.url.pathname.startsWith(route))) {
    if (!context.locals.user) {
      return context.redirect("/auth/signin");
    }

    if (
      !context.locals.hasProfessor &&
      context.locals.isBootstrapProfessorEmail &&
      context.url.pathname !== BOOTSTRAP_ROUTE
    ) {
      return context.redirect(BOOTSTRAP_ROUTE);
    }

    const isAllowedLinkedStudent = context.locals.role === "student" && context.locals.isLinkedStudent;

    if (context.locals.role !== "professor" && !isAllowedLinkedStudent) {
      return context.redirect(PENDING_ACCESS_ROUTE);
    }

    if (context.url.pathname.startsWith(PROFESSOR_ONLY_DASHBOARD_ROUTE) && context.locals.role !== "professor") {
      return context.redirect("/dashboard");
    }
  }

  if (context.url.pathname === PENDING_ACCESS_ROUTE) {
    if (!context.locals.user) {
      return context.redirect("/auth/signin");
    }

    if (!context.locals.hasProfessor && context.locals.isBootstrapProfessorEmail) {
      return context.redirect(BOOTSTRAP_ROUTE);
    }

    if (context.locals.role === "professor" || (context.locals.role === "student" && context.locals.isLinkedStudent)) {
      return context.redirect("/dashboard");
    }
  }

  return next();
});
