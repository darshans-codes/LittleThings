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
  if (
    s.autopilotEnabled !== undefined &&
    typeof s.autopilotEnabled !== "boolean"
  )
    throw new Error("Invalid preparation preference.");
  if (
    s.remindersEnabled !== undefined &&
    typeof s.remindersEnabled !== "boolean"
  )
    throw new Error("Invalid reminder preference.");
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
    for (const v of [p.focalX, p.focalY])
      if (v !== undefined && (!Number.isFinite(v) || v < 0 || v > 1))
        throw new Error("Invalid memory framing.");
    if (
      p.holdWeight !== undefined &&
      (!Number.isFinite(p.holdWeight) || p.holdWeight < 0.5 || p.holdWeight > 3)
    )
      throw new Error("Invalid memory pacing.");
    for (const v of [p.durationSeconds, p.trimStart, p.trimEnd]) {
      if (v !== undefined && (!Number.isFinite(v) || v < 0 || v > 600))
        throw new Error("Invalid clip timing.");
    }
    if (
      p.trimStart !== undefined &&
      p.trimEnd !== undefined &&
      p.trimEnd <= p.trimStart
    )
      throw new Error("Invalid clip range.");
    if (
      p.durationSeconds !== undefined &&
      ((p.trimEnd ?? 0) > p.durationSeconds ||
        (p.trimStart ?? 0) >= p.durationSeconds)
    )
      throw new Error("Clip range exceeds duration.");
    if (p.reviewed !== undefined && typeof p.reviewed !== "boolean")
      throw new Error("Invalid review status.");
    if (
      p.quality &&
      (!/^[01]{64}$/.test(p.quality.fingerprint) ||
        !Number.isFinite(p.quality.brightness) ||
        !Number.isFinite(p.quality.sharpness) ||
        !Array.isArray(p.quality.issues) ||
        p.quality.issues.length > 10 ||
        !p.quality.issues.every((i) => text(i, 150)))
    )
      throw new Error("Invalid media analysis.");
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
    if (p.transition !== undefined && !["Fade", "Cut"].includes(p.transition))
      throw new Error("Invalid transition.");
    if (
      (p.occasion !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(p.occasion)) ||
      (p.preparedByAutopilot !== undefined &&
        typeof p.preparedByAutopilot !== "boolean")
    )
      throw new Error("Invalid occasion draft.");
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
    if (
      p.music?.volume !== undefined &&
      (!Number.isFinite(p.music.volume) ||
        p.music.volume < 0 ||
        p.music.volume > 1)
    )
      throw new Error("Invalid music level.");
    if (
      p.voice?.startSeconds !== undefined &&
      (!Number.isFinite(p.voice.startSeconds) ||
        p.voice.startSeconds < 0 ||
        p.voice.startSeconds > 60)
    )
      throw new Error("Invalid voice timing.");
  }
}
