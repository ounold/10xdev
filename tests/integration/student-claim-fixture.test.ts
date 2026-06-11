import { afterEach, describe, expect, it, vi } from "vitest";

import {
  prepareClaimReadyFixture,
  prepareDuplicateClaimFixture,
  resetStudentClaimFixture,
} from "../e2e/support/studentClaimFixture";

const fetchMock = vi.fn<typeof fetch>();

describe("student claim fixture prep", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("prepares exactly one claim-ready student row and removes prior matches for that email", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(""),
    } as Response);

    await prepareClaimReadyFixture({
      email: "student@example.com",
      professorProfileId: "prof-1",
      fullName: "Claim Ready Student",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://example.supabase.co/rest/v1/students?email=eq.student%40example.com",
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://example.supabase.co/rest/v1/students?email=eq.student%40example.com",
      {
        method: "DELETE",
        headers: {
          apikey: "service-role",
          Authorization: "Bearer service-role",
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
      },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://example.supabase.co/rest/v1/students",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify([
          {
            professor_profile_id: "prof-1",
            student_profile_id: null,
            archived_student_profile_id: null,
            lifecycle: "active",
            archived_at: null,
            full_name: "Claim Ready Student",
            email: "student@example.com",
          },
        ]),
      }),
    );
  });

  it("prepares a duplicate-email blocked state with two unlinked student rows", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(""),
    } as Response);

    await prepareDuplicateClaimFixture({
      email: "student@example.com",
      professorProfileId: "prof-1",
      fullNames: ["Duplicate One", "Duplicate Two"],
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://example.supabase.co/rest/v1/students",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify([
          {
            professor_profile_id: "prof-1",
            student_profile_id: null,
            archived_student_profile_id: null,
            lifecycle: "active",
            archived_at: null,
            full_name: "Duplicate One",
            email: "student@example.com",
          },
          {
            professor_profile_id: "prof-1",
            student_profile_id: null,
            archived_student_profile_id: null,
            lifecycle: "active",
            archived_at: null,
            full_name: "Duplicate Two",
            email: "student@example.com",
          },
        ]),
      }),
    );
  });

  it("can reset the fixture state by deleting all student rows for the target email", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role");
    vi.stubGlobal("fetch", fetchMock);

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(""),
    } as Response);

    await resetStudentClaimFixture("student@example.com");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://example.supabase.co/rest/v1/students?email=eq.student%40example.com",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "DELETE",
      headers: {
        apikey: "service-role",
        Authorization: "Bearer service-role",
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
    });
  });
});
