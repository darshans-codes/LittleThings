import { afterEach, describe, expect, it, vi } from "vitest";
import { seed, type Photo, type Story } from "./model";
import {
  clipTime,
  cropRect,
  dimensions,
  filmTimeline,
  sceneAt,
} from "./film-timeline";
import { createFilmSession } from "./film-session";
import { validatePlan } from "./edit-plan.mjs";
import { validateState } from "./validation";
import { verifyVideoDuration } from "./export";

const story: Story = {
  id: "film",
  personId: "maya",
  title: "Birthday",
  tone: "Emotional",
  duration: 30,
  format: "Story",
  photoIds: [],
  created: "2026-11-19",
  closing: "Happy birthday",
  transition: "Fade",
};
const photo = (): Photo => ({ ...seed().photos[0] });

describe("one film timeline for preview and export", () => {
  it("balances pacing while reserving the closing and uses exact scene boundaries", () => {
    const a = photo(),
      b = { ...photo(), id: "second", holdWeight: 2 };
    const timeline = filmTimeline([a, b], 30);
    expect(timeline[1].end).toBe(26.4);
    expect(timeline[1].end - timeline[1].start).toBeCloseTo(
      2 * timeline[0].end,
    );
    expect(sceneAt(timeline, timeline[0].end)?.index).toBe(1);
    expect(sceneAt(timeline, 26.4)).toBeUndefined();
    expect(filmTimeline([], 30)).toEqual([]);
  });
  it("keeps crops inside the source in every export format", () => {
    for (const [w, h] of Object.values(dimensions))
      for (const [iw, ih] of [
        [4000, 1000],
        [1000, 4000],
      ])
        for (const point of [0, 0.5, 1]) {
          const c = cropRect(iw, ih, w, h, point, point, 1.035);
          expect(c.x).toBeGreaterThanOrEqual(0);
          expect(c.y).toBeGreaterThanOrEqual(0);
          expect(c.x + c.width).toBeLessThanOrEqual(iw + 0.00001);
          expect(c.y + c.height).toBeLessThanOrEqual(ih + 0.00001);
          expect(c.width / c.height).toBeCloseTo(w / h);
        }
  });
  it("honors clip in/out points, including a short clip held within a long scene", () => {
    const p = { ...photo(), trimStart: 2, trimEnd: 4 };
    const scene = { index: 0, start: 5, end: 15 };
    expect(clipTime(p, scene, 5, 10)).toBe(2);
    expect(clipTime(p, scene, 20, 10)).toBeLessThan(4);
    expect(clipTime(p, scene, 20, 3)).toBeLessThan(3);
  });
});

class TestMedia extends EventTarget {
  static all: TestMedia[] = [];
  declare src: string;
  duration = 10;
  readyState = 2;
  paused = true;
  ended = false;
  seeking = false;
  videoWidth = 1600;
  videoHeight = 900;
  naturalWidth = 1600;
  naturalHeight = 900;
  playsInline = true;
  preload = "auto";
  loop = false;
  private time = 0;
  constructor() {
    super();
    TestMedia.all.push(this);
  }
  get currentTime() {
    return this.time;
  }
  set currentTime(value: number) {
    this.time = value;
    queueMicrotask(() => this.dispatchEvent(new Event("seeked")));
  }
  play = vi.fn(async () => {
    this.paused = false;
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
  load = vi.fn();
  removeAttribute(name: string) {
    if (name === "src") this.src = "";
  }
}
class TestImage extends TestMedia {}
class TestVideo extends TestMedia {}
function installMedia() {
  TestMedia.all = [];
  for (const [name, value] of Object.entries({
    Image: TestImage,
    Audio: TestMedia,
    HTMLImageElement: TestImage,
    HTMLVideoElement: TestVideo,
    HTMLMediaElement: TestMedia,
  }))
    vi.stubGlobal(name, value);
  vi.stubGlobal("document", { createElement: () => new TestVideo() });
  // Real browser load events are asynchronous. Simulate that boundary without loading any private files.
  Object.defineProperty(TestMedia.prototype, "src", {
    configurable: true,
    get() {
      return this.url ?? "";
    },
    set(value: string) {
      this.url = value;
      if (value && value !== "stall")
        queueMicrotask(() =>
          this.dispatchEvent(
            new Event(
              value === "broken"
                ? "error"
                : this instanceof TestImage
                  ? "load"
                  : "loadeddata",
            ),
          ),
        );
    },
  });
}
afterEach(() => vi.unstubAllGlobals());

describe("film media lifecycle", () => {
  it("refuses truncated video output before presenting it as ready", async () => {
    installMedia();
    const blob = new Blob(["test container"], { type: "video/mp4" });
    await expect(
      verifyVideoDuration(blob, 30, new AbortController().signal),
    ).rejects.toThrow("full length");
    await expect(
      verifyVideoDuration(blob, 10, new AbortController().signal),
    ).resolves.toBeUndefined();
    expect(TestMedia.all.every((m) => !m.src)).toBe(true);
  });
  it("seeks to the in-point before preparing, then stops at the out-point and disposes sources", async () => {
    installMedia();
    const p = { ...photo(), kind: "video" as const, trimStart: 2, trimEnd: 4 };
    const film = await createFilmSession(
      seed().people[0],
      [p],
      story,
      new AbortController().signal,
    );
    const video = TestMedia.all[0];
    expect(video.currentTime).toBe(2);
    expect(video.play).not.toHaveBeenCalled();
    film.updateSettings(seed().people[0], [{ ...p, focalX: 1 }], { ...story, transition: "Cut" });
    expect(TestMedia.all).toHaveLength(1);
    expect(() => film.updateSettings(seed().people[0], [{ ...p, src: "different" }], story)).toThrow("sources changed");
    film.sync(1, true);
    expect(video.currentTime).toBe(3);
    film.sync(8, true);
    expect(video.paused).toBe(true);
    expect(video.currentTime).toBeLessThan(4);
    film.dispose();
    expect(video.src).toBe("");
    expect(() => film.sync(0, true)).toThrow();
  });
  it("cancels pending preparation and releases partially loaded media", async () => {
    installMedia();
    const controller = new AbortController();
    const pending = createFilmSession(
      seed().people[0],
      [{ ...photo(), src: "stall" }],
      story,
      controller.signal,
    );
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(TestMedia.all.every((m) => !m.src)).toBe(true);
  });
  it("fails a broken source instead of silently skipping a memory", async () => {
    installMedia();
    await expect(
      createFilmSession(
        seed().people[0],
        [{ ...photo(), src: "broken" }],
        story,
        new AbortController().signal,
      ),
    ).rejects.toThrow("could not be opened");
    expect(TestMedia.all.every((m) => !m.src)).toBe(true);
  });
  it("starts voice at its requested time and ducks music only during that message", async () => {
    installMedia();
    const film = await createFilmSession(
      seed().people[0],
      [],
      {
        ...story,
        music: { src: "music", name: "Music", volume: 0.5 },
        voice: { src: "voice", name: "Message", startSeconds: 8 },
      },
      new AbortController().signal,
    );
    const gains: {
      gain: { setTargetAtTime: ReturnType<typeof vi.fn>; value: number };
      connect: ReturnType<typeof vi.fn>;
    }[] = [];
    const audio = {
      currentTime: 0,
      createGain: () => {
        const g = {
          gain: { value: 0, setTargetAtTime: vi.fn() },
          connect: vi.fn(),
          disconnect: vi.fn(),
        };
        gains.push(g);
        return g;
      },
      createMediaElementSource: () => ({ connect: (g: unknown) => g }),
    } as unknown as AudioContext;
    film.connectAudio(audio, {} as AudioNode);
    film.sync(5, true, audio);
    expect(TestMedia.all[0].play).toHaveBeenCalled();
    expect(TestMedia.all[1].play).not.toHaveBeenCalled();
    expect(gains[0].gain.setTargetAtTime.mock.lastCall?.[0]).toBe(0.5);
    film.sync(9, true, audio);
    expect(TestMedia.all[1].play).toHaveBeenCalled();
    expect(gains[0].gain.setTargetAtTime.mock.lastCall?.[0]).toBe(0.15);
    film.sync(20, true, audio);
    expect(TestMedia.all[1].paused).toBe(true);
    expect(gains[0].gain.setTargetAtTime.mock.lastCall?.[0]).toBe(0.5);
    film.dispose();
  });
});

describe("grounded AI trimming and vault settings", () => {
  const plan = {
    summary: "Keep the best moment",
    tone: "Emotional",
    duration: 30,
    format: "Story",
    sequence: ["v"],
    captions: [{ id: "v", text: "Together" }],
    closing: "Happy birthday",
    clips: [{ id: "v", start: 2, end: 5 }],
  };
  it("accepts only trims within the actual supplied clip metadata", () => {
    const media = [{ id: "v", kind: "video", durationSeconds: 6 }];
    expect(validatePlan(plan, ["v"], media).clips?.[0].end).toBe(5);
    for (const clips of [
      [{ id: "v", start: 2, end: 7 }],
      [{ id: "v", start: 5, end: 2 }],
      [{ id: "v", start: 0, end: Infinity }],
      [{ id: "fake", start: 0, end: 1 }],
    ])
      expect(() => validatePlan({ ...plan, clips }, ["v"], media)).toThrow();
    expect(() => validatePlan(plan, ["v"])).toThrow();
    expect(() =>
      validatePlan(
        { ...plan, captions: [...plan.captions, ...plan.captions] },
        ["v"],
        media,
      ),
    ).toThrow();
  });
  it("rejects malicious framing or pace and preserves legacy vault compatibility", () => {
    const s = seed();
    expect(() => validateState(s)).not.toThrow();
    s.photos[0].focalX = -1;
    expect(() => validateState(s)).toThrow();
    s.photos[0].focalX = 0.5;
    s.photos[0].holdWeight = Infinity;
    expect(() => validateState(s)).toThrow();
    s.photos[0].holdWeight = 2;
    expect(() => validateState(s)).not.toThrow();
  });
});
