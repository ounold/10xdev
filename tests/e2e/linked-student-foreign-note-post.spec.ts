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

async function findForeignNoteId(baseURL: string | undefined, browser: Browser, foreignStudentId: string) {
  const professorStorageStatePath = process.env.E2E_PROFESSOR_STORAGE_STATE ?? defaultProfessorStorageStatePath;
  if (!fs.existsSync(professorStorageStatePath)) {
    return { noteId: null, createdTemporarily: false };
  }

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
      if (noteId) {
        return { noteId, createdTemporarily: false };
      }
    }

    if (!foreignStudentId) {
      return { noteId: null, createdTemporarily: false };
    }

    const temporaryContent = `temporary professor foreign note ${Date.now()}`;
    await professorPage.goto(`/dashboard/students/${foreignStudentId}`);
    await professorPage.getByLabel("Meeting date").fill("2026-06-05");
    await professorPage.getByRole("textbox", { name: "Item 1" }).fill(temporaryContent);
    await professorPage.getByRole("button", { name: "Remove" }).last().click();
    await professorPage.getByRole("button", { name: "Save note to this thread" }).click();
    await professorPage.waitForURL((url) => url.pathname.endsWith(`/dashboard/students/${foreignStudentId}`));

    const createdEditLink = professorPage.getByRole("link", { name: "Edit note" }).first();
    if ((await createdEditLink.count()) === 0) {
      return { noteId: null, createdTemporarily: false };
    }

    const createdHref = await createdEditLink.getAttribute("href");
    return {
      noteId: createdHref?.match(/edit=([^&]+)/)?.[1] ?? null,
      createdTemporarily: true,
    };
  } finally {
    await professorContext.close();
  }
}

test("linked student cannot post note changes to another student's note id", async ({ baseURL, browser }) => {
  const storageStatePath = process.env.E2E_LINKED_STUDENT_STORAGE_STATE ?? defaultLinkedStudentStorageStatePath;
  const meta = readLinkedStudentFixtureMeta();
  const foreignStudentId = process.env.E2E_FOREIGN_STUDENT_ID ?? meta.foreignStudentId;
  let createdTemporarily = false;
  let foreignNoteId: string | null = null;

  test.skip(!fs.existsSync(storageStatePath), `Missing storageState fixture: ${storageStatePath}`);
  test.skip(!foreignStudentId, "Set E2E_FOREIGN_STUDENT_ID or provide it through linked student fixture metadata.");

  ({ noteId: foreignNoteId, createdTemporarily } = await findForeignNoteId(baseURL, browser, foreignStudentId));
  test.skip(!foreignNoteId, "Missing professor storageState or no foreign note id could be resolved.");

  const apiContext = await request.newContext({
    baseURL,
    storageState: path.resolve(storageStatePath),
    maxRedirects: 0,
  });

  try {
    const response = await apiContext.post(`/api/dashboard/notes/${foreignNoteId}`, {
      form: {
        itemsPayload: JSON.stringify([
          {
            id: foreignNoteId,
            item_type: "info",
            content: "intrusion attempt",
          },
        ]),
      },
    });

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
