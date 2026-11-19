import type { Photo, Story } from "./model";

export const dimensions: Record<string, [number, number]> = {
  Story: [720, 1280],
  Square: [1080, 1080],
  Feed: [864, 1080],
  Landscape: [1280, 720],
};
export type Scene = { index: number; start: number; end: number };
export function filmTimeline(photos: Photo[], duration: number): Scene[] {
  const contentEnd = duration * 0.88;
  const sum = photos.reduce((n, p) => n + (p.holdWeight ?? 1), 0);
  let cursor = 0;
  return photos.map((p, index) => {
    const start = cursor;
    cursor =
      index === photos.length - 1
        ? contentEnd
        : cursor + (contentEnd * (p.holdWeight ?? 1)) / sum;
    return { index, start, end: cursor };
  });
}
export function sceneAt(timeline: Scene[], seconds: number): Scene | undefined {
  return timeline.find((s) => seconds >= s.start && seconds < s.end);
}
export function cropRect(
  iw: number,
  ih: number,
  w: number,
  h: number,
  x = 0.5,
  y = 0.5,
  zoom = 1,
) {
  const scale = Math.max(w / iw, h / ih) * zoom;
  const sw = w / scale,
    sh = h / scale;
  return {
    x: Math.max(0, Math.min(iw - sw, (iw - sw) * x)),
    y: Math.max(0, Math.min(ih - sh, (ih - sh) * y)),
    width: sw,
    height: sh,
  };
}
export function clipTime(
  photo: Photo,
  scene: Scene,
  seconds: number,
  actualDuration: number,
) {
  const start = Math.min(photo.trimStart ?? 0, actualDuration);
  const end = Math.min(photo.trimEnd ?? actualDuration, actualDuration);
  // Hold just before the out-point so an excluded frame never becomes the hold frame.
  return Math.max(
    start,
    Math.min(end - 0.04, start + Math.max(0, seconds - scene.start)),
  );
}
export function transitionDuration(story: Story, scene: Scene) {
  return story.transition === "Cut"
    ? 0
    : Math.min(0.5, (scene.end - scene.start) / 4);
}
