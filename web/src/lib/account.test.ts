import { describe, expect, it } from "vitest";
import { OPEN_ACCOUNT, accountFromProfile, isStudentRole, onboardingError } from "./account";
import type { OnboardingFields } from "./account";

describe("accountFromProfile", () => {
  it("keeps the site open before accounts.sql is installed", () => {
    expect(accountFromProfile(null)).toEqual(OPEN_ACCOUNT);
    expect(accountFromProfile({ full_name: "Ana" })).toEqual({ ...OPEN_ACCOUNT, name: "Ana" });
  });

  it("reads status, admin and onboarding", () => {
    expect(accountFromProfile({ status: "pending", is_admin: false, onboarded_at: null })).toEqual({
      status: "pending",
      isAdmin: false,
      onboarded: false,
      name: "",
      avatarUrl: null,
    });
    expect(
      accountFromProfile({
        status: "active",
        is_admin: true,
        onboarded_at: "2026-10-23T00:00:00Z",
        full_name: "Budi Santoso",
        preferred_name: "Budi",
        avatar_url: "https://x/avatar.webp",
      }),
    ).toEqual({ status: "active", isAdmin: true, onboarded: true, name: "Budi", avatarUrl: "https://x/avatar.webp" });
  });
});

describe("onboardingError", () => {
  const base: OnboardingFields = {
    full_name: "Budi Santoso",
    preferred_name: "",
    lab_role: "dosen",
    cohort: null,
    staff_id: "",
    research_topic: "",
    supervisor_id: null,
  };

  it("needs a name and a role", () => {
    expect(onboardingError({ ...base, full_name: " " }, 2026)).toMatch(/full name/);
    expect(onboardingError({ ...base, lab_role: "" as never }, 2026)).toMatch(/role/);
    expect(onboardingError(base, 2026)).toBeNull();
  });

  it("asks students for cohort, NIM and topic", () => {
    const s = { ...base, lab_role: "s2" as const };
    expect(isStudentRole("s2")).toBe(true);
    expect(onboardingError(s, 2026)).toMatch(/cohort/);
    expect(onboardingError({ ...s, cohort: 2030 }, 2026)).toMatch(/cohort/);
    expect(onboardingError({ ...s, cohort: 2024 }, 2026)).toMatch(/NIM/);
    expect(onboardingError({ ...s, cohort: 2024, staff_id: "23/1" }, 2026)).toMatch(/topic/);
    expect(onboardingError({ ...s, cohort: 2024, staff_id: "23/1", research_topic: "PPFD" }, 2026)).toBeNull();
  });
});
