import type { State } from "./model";
const text = (s: unknown, max: number) =>
  typeof s === "string" && s.length <= max;
export function safeMedia(src: unknown): boolean {
  return (
    typeof src === "string" &&
    (/^\/photos\/[a-z]+\.jpg$/.test(src) ||
      /^data:(image\/(jpeg|png|webp)|video\/(mp4|webm));base64,[A-Za-z0-9+/=]+$/.test(
        src,
      ))
  );
}
export function validateState(value: unknown): asserts value is State {
  const s = value as State;
  if (
    !s ||
    !Array.isArray(s.people) ||
    !Array.isArray(s.photos) ||
    !Array.isArray(s.stories) ||
    s.people.length > 1000 ||
    s.photos.length > 5000 ||
    s.stories.length > 5000 ||
    ![3, 7, 14].includes(s.reminderDays) ||
    typeof s.onboarded !== "boolean"
  )
    throw new Error("The backup contains invalid app data.");
  const people = new Set<string>(),
    media = new Set<string>();
  for (const p of s.people) {
    if (
      !text(p.id, 100) ||
      people.has(p.id) ||
      !text(p.name, 40) ||
      !p.name.trim() ||
      !text(p.relation, 50) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(p.birthday) ||
      !Number.isFinite(Date.parse(p.birthday)) ||
      !["Emotional", "Funny", "Elegant", "Timeline"].includes(p.tone) ||
      (p.avatar && !safeMedia(p.avatar))
    )
      throw new Error("Invalid person in backup.");
    people.add(p.id);
  }
  for (const p of s.photos) {
    if (
      !text(p.id, 100) ||
      media.has(p.id) ||
      !people.has(p.personId) ||
      !safeMedia(p.src) ||
      !text(p.name, 255) ||
      !text(p.caption, 150) ||
      typeof p.selected !== "boolean" ||
      (p.poster && !safeMedia(p.poster)) ||
      (p.kind !== undefined && !["photo", "video"].includes(p.kind)) ||
      (p.pinned !== undefined && typeof p.pinned !== "boolean")
    )
      throw new Error("Invalid photo or video in backup.");
    media.add(p.id);
  }
  for (const p of s.stories) {
    if (
      !text(p.id, 100) ||
      !people.has(p.personId) ||
      !text(p.title, 200) ||
      !text(p.closing, 200) ||
      !["Emotional", "Funny", "Elegant", "Timeline"].includes(p.tone) ||
      ![30, 45, 60].includes(p.duration) ||
      !["Story", "Square", "Feed", "Landscape"].includes(p.format) ||
      !Array.isArray(p.photoIds) ||
      !p.photoIds.every((id) => typeof id === "string")
    )
      throw new Error("Invalid story in backup.");
    for (const a of [p.music, p.voice])
      if (
        a &&
        (!text(a.name, 255) ||
          typeof a.src !== "string" ||
          !/^data:audio\/(mpeg|wav|x-wav|ogg|webm|mp4);base64,[A-Za-z0-9+/=]+$/.test(
            a.src,
          ))
      )
        throw new Error("Invalid audio in backup.");
  }
}
