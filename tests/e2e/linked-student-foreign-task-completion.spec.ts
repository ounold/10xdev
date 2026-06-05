import fs from "node:fs";
import path from "node:path";

import type { Browser } from "@playwright/test";
import { expect, request, test } from "@playwright/test";

import { defaultLinkedStudentStorageStatePath, readLinkedStudentFixtureMeta } from "./support/linkedStudentFixture";
import { loadE2EEnv } from "./support/env";

const defaultProfessorStorageStatePath = ".auth/user.json";

loadE2EEnv();

async function cleanupTemporaryForeignNote(noteId: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return;
  }

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  await fetch(`${supabaseUrl}/rest/v1/note_items?note_id=eq.${encodeURIComponent(noteId)}`, {
    method: "DELETE",
    headers,
  });
  await fetch(`${supabaseUrl}/rest/v1/notes?id=eq.${encodeURIComponent(noteId)}`, {
    method: "DELETE",
    headers,
  });
}

async function findForeignTaskTarget(baseURL: string | undefined, browser: Browser, foreignStudentId: string) {
  const professorStorageStatePath = process.env.E2E_PROFESSOR_STORAGE_STATE ?? defaultProfessorStorageStatePath;
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!fs.existsSync(professorStorageStatePath) || !supabaseUrl || !serviceRoleKey) {
    return { noteId: null, itemId: null, createdTemporarily: false };
  }

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  const professorContext = await browser.newContext({
    baseURL,
    storageState: path.resolve(professorStorageStatePath),
  });
  const professorPage = await professorContext.newPage();

  try {
    const ownStudentId = process.env.E2E_OWN_STUDENT_ID ?? readLinkedStudentFixtureMeta().ownStudentId;
    const candidateStudentIds = new Set<string>();

    if (foreignStudentId) {
      candidateStudentIds.add(foreignStudentId);
    }

    await professorPage.goto("/dashboard");
    const threadLinks = await professorPage.locator('a[href^="/dashboard/students/"]').evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href"))
        .filter((href): href is string => Boolean(href))
        .map((href) => href.split("/").pop() ?? ""),
    );

    for (const studentId of threadLinks) {
      if (!studentId || studentId === ownStudentId) {
        continue;
      }
      candidateStudentIds.add(studentId);
    }

    for (const studentId of candidateStudentIds) {
      await professorPage.goto(`/dashboard/students/${studentId}`);
      const firstEditLink = professorPage.getByRole("link", { name: "Edit note" }).first();
      if ((await firstEditLink.count()) === 0) {
        continue;
      }

      const href = await firstEditLink.getAttribute("href");
      const noteId = href?.match(/edit=([^&]+)/)?.[1] ?? null;
      if (!noteId) {
        continue;
      }

      const response = await fetch(
        `${supabaseUrl}/rest/v1/note_items?note_id=eq.${encodeURIComponent(noteId)}&item_type=eq.task&select=id&limit=1`,
        { headers },
      );
      const items = (await response.json()) as { id: string }[];
      if (items[0]?.id) {
        return { noteId, itemId: items[0].id, createdTemporarily: false };
      }
    }

    if (!foreignStudentId) {
      return { noteId: null, itemId: null, createdTemporarily: false };
    }

    const temporaryTask = `temporary foreign task ${Date.now()}`;
    await professorPage.goto(`/dashboard/students/${foreignStudentId}`);
    await professorPage.getByLabel("Meeting date").fill("2026-06-05");
    await professorPage.getByRole("textbox", { name: "Item 1" }).fill(`temporary info ${Date.now()}`);
    await professorPage.getByRole("textbox", { name: "Item 2" }).fill(temporaryTask);
    await professorPage.getByRole("button", { name: "Save note to this thread" }).click();
    await professorPage.waitForURL((url) => url.pathname.endsWith(`/dashboard/students/${foreignStudentId}`));

    const createdEditLink = professorPage.getByRole("link", { name: "Edit note" }).first();
    if ((await createdEditLink.count()) === 0) {
      return { noteId: null, itemId: null, createdTemporarily: false };
    }

    const createdHref = await createdEditLink.getAttribute("href");
    const createdNoteId = createdHref?.match(/edit=([^&]+)/)?.[1] ?? null;

    if (!createdNoteId) {
      return { noteId: null, itemId: null, createdTemporarily: false };
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/note_items?note_id=eq.${encodeURIComponent(createdNoteId)}&item_type=eq.task&select=id&limit=1`,
      { headers },
    );
    const items = (await response.json()) as { id: string }[];

    return {
      noteId: createdNoteId,
      itemId: items[0]?.id ?? null,
      createdTemporarily: true,
    };
  } finally {
    await professorContext.close();
  }
}

test("linked student cannot toggle completion for another student's task item", async ({ baseURL, browser }) => {
  const storageStatePath = process.env.E2E_LINKED_STUDENT_STORAGE_STATE ?? defaultLinkedStudentStorageStatePath;
  const meta = readLinkedStudentFixtureMeta();
  const foreignStudentId = process.env.E2E_FOREIGN_STUDENT_ID ?? meta.foreignStudentId;
  let createdTemporarily = false;
  let foreignNoteId: string | null = null;
  let foreignTaskItemId: string | null = null;

  test.skip(!fs.existsSync(storageStatePath), `Missing storageState fixture: ${storageStatePath}`);
  test.skip(!foreignStudentId, "Set E2E_FOREIGN_STUDENT_ID or provide it through linked student fixture metadata.");

  ({
    noteId: foreignNoteId,
    itemId: foreignTaskItemId,
    createdTemporarily,
  } = await findForeignTaskTarget(baseURL, browser, foreignStudentId));
  test.skip(
    !foreignNoteId || !foreignTaskItemId,
    "Missing professor fixture or no foreign task item could be resolved.",
  );

  const apiContext = await request.newContext({
    baseURL,
    storageState: path.resolve(storageStatePath),
    maxRedirects: 0,
  });

  try {
    const response = await apiContext.post(
      `/api/dashboard/notes/${foreignNoteId}/items/${foreignTaskItemId}/completion`,
      {
        form: {
          state: "complete",
        },
      },
    );

    expect([302, 403]).toContain(response.status());

    if (response.status() === 302) {
      expect(response.headers().location).toContain(
        "/dashboard?error=The+selected+note+is+not+available+in+your+student+history.",
      );
    } else {
      await expect(async () => {
        expect((await response.text()).toLowerCase()).toContain("forbidden");
      }).toPass();
    }
  } finally {
    await apiContext.dispose();
    if (createdTemporarily && foreignNoteId) {
      await cleanupTemporaryForeignNote(foreignNoteId);
    }
  }
});
