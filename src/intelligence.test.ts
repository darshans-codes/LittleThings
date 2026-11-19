import { describe, expect, it } from "vitest";
import { analyzePixels, similarFingerprint } from "./media-analysis";
import { prepareBirthdays } from "./autopilot";
import { seed } from "./model";
import { validateState } from "./validation";
import { reminderDates } from "./reminders";

describe("birthday preparation", () => {
  const now = new Date(2026, 11, 29, 12);
  function sample() {
    const s = seed();
    s.autopilotEnabled = true;
    s.people = [{ ...s.people[0], demo: false, birthday: "2000-01-02" }];
    s.photos = s.photos.filter((p) => p.personId === s.people[0].id);
    s.photos[0].reason = "Possible blur";
    return s;
  }
  it("prepares next year's occasion once and leaves flagged media for approval", () => {
    const s = sample(),
      result = prepareBirthdays(s, now);
    expect(result.stories[0].occasion).toBe("2027-01-02");
    expect(result.stories[0].photoIds).not.toContain(s.photos[0].id);
    expect(prepareBirthdays(result, now)).toBe(result);
    expect(() => validateState(result)).not.toThrow();
  });
  it("honors pause and protects manually edited drafts", () => {
    const s = sample();
    s.autopilotEnabled = false;
    expect(prepareBirthdays(s, now)).toBe(s);
    const result = prepareBirthdays({ ...s, autopilotEnabled: true }, now);
    delete result.stories[0].occasion;
    expect(prepareBirthdays(result, now)).toBe(result);
  });
  it("works without photos and skips samples and distant occasions", () => {
    const s = sample();
    s.photos = [];
    expect(prepareBirthdays(s, now).stories[0].photoIds).toEqual([]);
    s.people[0].demo = true;
    expect(prepareBirthdays(s, now)).toBe(s);
    s.people[0].demo = false;
    s.people[0].birthday = "2000-06-01";
    expect(prepareBirthdays(s, now)).toBe(s);
  });
});

describe("local media hints", () => {
  it("flags dark, bright and flat inputs without claiming identity or safety", () => {
    const pixels = new Uint8ClampedArray(96 * 96 * 4);
    expect(analyzePixels(pixels, 96, 96).issues.join()).toContain("dark");
    pixels.fill(255);
    const q = analyzePixels(pixels, 96, 96);
    expect(q.issues.join()).toContain("bright");
    expect(q.issues.join()).toContain("soft");
    expect(similarFingerprint(q.fingerprint, q.fingerprint)).toBe(false);
  });
  it("compares useful fingerprints conservatively", () => {
    const a = "01".repeat(32);
    expect(similarFingerprint(a, a)).toBe(true);
    expect(similarFingerprint(a, "10".repeat(32))).toBe(false);
    expect(similarFingerprint(undefined, a)).toBe(false);
  });
  it("rejects tampered clip ranges and analysis in encrypted backups", () => {
    const s = seed();
    s.photos[0].trimStart = 10;
    s.photos[0].trimEnd = 5;
    expect(() => validateState(s)).toThrow();
    s.photos[0].trimEnd = 20;
    s.photos[0].durationSeconds = 15;
    expect(() => validateState(s)).toThrow();
  });
});

describe("private reminder scheduling", () => {
  it("uses local dates across year boundaries and omits past reminders", () => {
    const s = seed();
    s.people = [{ ...s.people[0], demo: false, birthday: "2000-01-02" }];
    s.reminderDays = 3;
    const dates = reminderDates(s, new Date(2026, 11, 29, 12));
    expect(
      dates.map((d) => [
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        d.getHours(),
      ]),
    ).toEqual([
      [2026, 11, 30, 9],
      [2027, 0, 2, 9],
    ]);
    expect(reminderDates(s, new Date(2027, 0, 2, 10))).toEqual([]);
  });
  it("deduplicates shared dates and stays below the platform pending limit", () => {
    const s = seed();
    s.people = Array.from({ length: 80 }, (_, i) => ({
      ...s.people[0],
      id: String(i),
      demo: false,
      birthday: `2000-${String(1 + Math.floor(i / 28)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`,
    }));
    const dates = reminderDates(s, new Date(2026, 11, 1));
    expect(dates.length).toBeLessThanOrEqual(60);
    expect(new Set(dates.map((d) => d.getTime())).size).toBe(dates.length);
  });
});
