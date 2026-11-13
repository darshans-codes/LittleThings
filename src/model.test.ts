import { describe, it, expect } from "vitest";
import { daysUntil, captionFor, seed, birthdayLabel } from "./model";
describe("birthday scheduling", () => {
  it("uses local calendar days and ignores birth year", () =>
    expect(daysUntil("1994-11-13", new Date(2026, 10, 13, 22))).toBe(0));
  it("rolls past birthdays into next year", () =>
    expect(daysUntil("1994-11-12", new Date(2026, 10, 13))).toBe(364));
  it("handles year boundaries", () =>
    expect(daysUntil("2000-01-01", new Date(2026, 11, 31))).toBe(1));
  it("observes leap-day birthdays on February 28 in nonleap years", () =>
    expect(daysUntil("2000-02-29", new Date(2027, 1, 27))).toBe(1));
  it("keeps February 29 in leap years", () =>
    expect(daysUntil("2000-02-29", new Date(2028, 1, 28))).toBe(1));
  it("formats month and day without timezone shifts", () =>
    expect(birthdayLabel("1998-11-13")).toBe("Nov 13"));
});
describe("sample and caption integrity", () => {
  it("marks all sample people and photos as demonstrations", () => {
    const s = seed();
    expect(s.people.every((p) => p.demo)).toBe(true);
    expect(s.photos.every((p) => p.demo)).toBe(true);
    expect(
      s.photos.every((p) => s.people.some((x) => x.id === p.personId)),
    ).toBe(true);
  });
  it("supplies a grounded fallback for unknown tones", () =>
    expect(captionFor("missing", 100, "Sam")).toBe(
      "Life is sweeter with you in it.",
    ));
});
