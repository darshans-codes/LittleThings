import type { Person, Photo, Story } from "./model";
import {
  clipTime,
  cropRect,
  filmTimeline,
  sceneAt,
  transitionDuration,
} from "./film-timeline";

function abortError() {
  return new DOMException("Film cancelled", "AbortError");
}
export function loadMedia(
  source: HTMLImageElement | HTMLMediaElement,
  src: string,
  signal: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    const event = source instanceof HTMLImageElement ? "load" : "loadeddata";
    const cleanup = () => {
      clearTimeout(timer);
      source.removeEventListener(event, ready);
      source.removeEventListener("error", failed);
      signal.removeEventListener("abort", aborted);
    };
    const ready = () => {
      cleanup();
      resolve();
    };
    const failed = () => {
      cleanup();
      reject(new Error("A memory could not be opened. Replace it and retry."));
    };
    const aborted = () => {
      cleanup();
      reject(abortError());
    };
    const timer = setTimeout(failed, 15000);
    if (signal.aborted) {
      aborted();
      return;
    }
    source.addEventListener(event, ready, { once: true });
    source.addEventListener("error", failed, { once: true });
    signal.addEventListener("abort", aborted, { once: true });
    source.src = src;
  });
}

async function seekMedia(
  media: HTMLMediaElement,
  seconds: number,
  signal: AbortSignal,
) {
  if (Math.abs(media.currentTime - seconds) < 0.005) return;
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer);
      media.removeEventListener("seeked", done);
      signal.removeEventListener("abort", abort);
    };
    const done = () => {
      cleanup();
      resolve();
    };
    const abort = () => {
      cleanup();
      reject(abortError());
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("This clip could not seek to the selected moment."));
    }, 10000);
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    media.addEventListener("seeked", done, { once: true });
    media.currentTime = seconds;
  });
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  line: number,
) {
  const lines: string[] = [];
  let current = "";
  // Break long unspaced words too, and reserve a fixed caption-safe area.
  for (const char of text) {
    if (
      char === "\n" ||
      (current && ctx.measureText(current + char).width > width)
    ) {
      lines.push(current.trim());
      current = "";
    }
    if (char !== "\n") current += char;
  }
  if (current) lines.push(current.trim());
  const visible = lines.slice(0, 4);
  if (lines.length > 4) visible[3] = visible[3].slice(0, -1) + "…";
  visible.forEach((s, i) => ctx.fillText(s, x, y + i * line, width));
}

export async function createFilmSession(
  person: Person,
  photos: Photo[],
  story: Story,
  signal: AbortSignal,
) {
  const sources: (HTMLImageElement | HTMLVideoElement)[] = [];
  const media: HTMLMediaElement[] = [];
  const gains = new Map<HTMLMediaElement, GainNode>();
  let timeline = filmTimeline(photos, story.duration);
  let music: HTMLAudioElement | undefined, voice: HTMLAudioElement | undefined;
  let disposed = false,
    playbackError: Error | undefined;
  const release = () => {
    if (disposed) return;
    disposed = true;
    for (const item of sources) {
      if (item instanceof HTMLMediaElement) item.pause();
      item.removeAttribute("src");
    }
    for (const item of media) {
      item.pause();
      item.removeAttribute("src");
      item.load();
    }
    gains.forEach((g) => g.disconnect());
    gains.clear();
  };
  const controller = new AbortController();
  const cancel = () => {
    controller.abort();
    release();
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    // Sequential decode bounds peak decode pressure and makes cancellation predictable.
    for (const p of photos) {
      if (signal.aborted) throw abortError();
      const source =
        p.kind === "video" ? document.createElement("video") : new Image();
      sources.push(source);
      if (source instanceof HTMLVideoElement) {
        source.playsInline = true;
        source.preload = "auto";
        media.push(source);
      }
      await loadMedia(source, p.src, controller.signal);
      if (
        source instanceof HTMLVideoElement &&
        (!Number.isFinite(source.duration) || source.duration <= 0)
      )
        throw new Error("This clip has no playable duration.");
      if (source instanceof HTMLVideoElement)
        await seekMedia(
          source,
          Math.min(p.trimStart ?? 0, Math.max(0, source.duration - 0.04)),
          controller.signal,
        );
    }
    for (const [kind, track] of [
      ["music", story.music],
      ["voice", story.voice],
    ] as const) {
      if (!track) continue;
      const audio = new Audio();
      audio.preload = "auto";
      media.push(audio);
      await loadMedia(audio, track.src, controller.signal);
      if (kind === "music") {
        music = audio;
        music.loop = true;
      } else voice = audio;
    }
  } catch (error) {
    controller.abort();
    release();
    signal.removeEventListener("abort", cancel);
    throw error;
  }

  const play = (item: HTMLMediaElement) => {
    if (item.paused && !item.ended)
      void item.play().catch(() => {
        if (!disposed)
          playbackError = new Error(
            "A clip or audio track could not play. Tap play again, or replace it.",
          );
      });
  };
  return {
    get timeline() {
      return timeline;
    },
    updateSettings(nextPerson: Person, nextPhotos: Photo[], nextStory: Story) {
      if (
        nextPhotos.length !== photos.length ||
        nextPhotos.some((p, i) => p.src !== photos[i].src) ||
        nextStory.music?.src !== story.music?.src ||
        nextStory.voice?.src !== story.voice?.src
      )
        throw new Error("Film sources changed. Reload the preview.");
      person = nextPerson;
      photos = nextPhotos;
      story = nextStory;
      timeline = filmTimeline(photos, story.duration);
    },
    onSeeked(callback: () => void) {
      for (const item of media)
        item.addEventListener("seeked", callback, {
          signal: controller.signal,
        });
    },
    connectAudio(ctx: AudioContext, destination: AudioNode) {
      for (const item of media) {
        const source = ctx.createMediaElementSource(item),
          gain = ctx.createGain();
        gain.gain.value = 0;
        source.connect(gain).connect(destination);
        gains.set(item, gain);
      }
    },
    pause() {
      media.forEach((item) => item.pause());
    },
    sync(seconds: number, playing: boolean, ctx?: AudioContext) {
      if (disposed || signal.aborted) throw abortError();
      if (playbackError) {
        const error = playbackError;
        playbackError = undefined;
        throw error;
      }
      const scene = sceneAt(timeline, seconds);
      const voiceStart = Math.min(
        story.voice?.startSeconds ?? 0,
        story.duration - 1,
      );
      const speaking =
        !!voice &&
        seconds >= voiceStart &&
        seconds - voiceStart < voice.duration;
      for (let i = 0; i < sources.length; i++) {
        const item = sources[i];
        if (!(item instanceof HTMLVideoElement)) continue;
        if (scene?.index !== i) {
          item.pause();
          if (
            scene &&
            scene.index === i + 1 &&
            seconds - scene.start < transitionDuration(story, scene) &&
            !item.seeking
          ) {
            const target = clipTime(
              photos[i],
              timeline[i],
              timeline[i].end,
              item.duration,
            );
            if (Math.abs(item.currentTime - target) > 0.005)
              item.currentTime = target;
          }
          continue;
        }
        const target = clipTime(photos[i], scene, seconds, item.duration);
        const atEnd =
          seconds - scene.start >=
          (photos[i].trimEnd ?? item.duration) -
            (photos[i].trimStart ?? 0) -
            0.04;
        if (
          Math.abs(item.currentTime - target) > (atEnd ? 0.005 : 0.18) ||
          !playing
        ) {
          if (!item.seeking && Math.abs(item.currentTime - target) > 0.005)
            item.currentTime = target;
        }
        if (playing && !atEnd) play(item);
        else item.pause();
      }
      for (const [item, offset] of [
        [music, 0],
        [voice, voiceStart],
      ] as const) {
        if (!item) continue;
        const target = Math.max(0, seconds - offset);
        const current =
          item === music && Number.isFinite(item.duration)
            ? target % item.duration
            : Math.min(target, item.duration || target);
        if (Math.abs(item.currentTime - current) > 0.18 || !playing) {
          if (!item.seeking) item.currentTime = current;
        }
        if (
          playing &&
          seconds >= offset &&
          seconds < story.duration &&
          (item === music || target < item.duration)
        )
          play(item);
        else item.pause();
      }
      if (ctx)
        gains.forEach((gain, item) => {
          const base =
            item === music
              ? (story.music?.volume ?? 0.35) * (speaking ? 0.3 : 1)
              : item === voice
                ? 1
                : speaking
                  ? 0.4
                  : 1;
          const fade = Math.max(
            0,
            Math.min(1, seconds / 0.4, (story.duration - seconds) / 0.7),
          );
          gain.gain.setTargetAtTime(base * fade, ctx.currentTime, 0.04);
        });
    },
    draw(ctx: CanvasRenderingContext2D, seconds: number) {
      const w = ctx.canvas.width,
        h = ctx.canvas.height;
      const scene = sceneAt(timeline, seconds);
      ctx.fillStyle = story.tone === "Elegant" ? "#211f28" : "#34263d";
      ctx.fillRect(0, 0, w, h);
      const paint = (index: number, at: number) => {
        const source = sources[index],
          p = photos[index],
          s = timeline[index];
        if (
          !source ||
          (source instanceof HTMLVideoElement &&
            (source.readyState < 2 || source.seeking))
        )
          return;
        const iw =
          source instanceof HTMLVideoElement
            ? source.videoWidth
            : source.naturalWidth;
        const ih =
          source instanceof HTMLVideoElement
            ? source.videoHeight
            : source.naturalHeight;
        const zoom =
          source instanceof HTMLVideoElement
            ? 1
            : 1 +
              Math.max(0, Math.min(1, (at - s.start) / (s.end - s.start))) *
                0.035;
        const crop = cropRect(iw, ih, w, h, p.focalX, p.focalY, zoom);
        ctx.drawImage(
          source,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          w,
          h,
        );
      };
      if (scene) {
        const fade = transitionDuration(story, scene);
        const alpha =
          scene.index && fade ? Math.min(1, (seconds - scene.start) / fade) : 1;
        if (alpha < 1) paint(scene.index - 1, timeline[scene.index - 1].end);
        ctx.save();
        ctx.globalAlpha = alpha;
        paint(scene.index, seconds);
        ctx.restore();
        const gradient = ctx.createLinearGradient(0, h * 0.3, 0, h);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(1, "rgba(25,17,29,.9)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = `${Math.min(w * 0.037, h * 0.038)}px sans-serif`;
        wrap(
          ctx,
          photos[scene.index].caption,
          w / 2,
          h * 0.76,
          w * 0.8,
          Math.min(w * 0.055, h * 0.05),
        );
      }
      ctx.fillStyle = "#fff5df";
      ctx.textAlign = "center";
      ctx.font = `italic ${Math.min(w * 0.073, h * 0.09)}px Georgia`;
      ctx.fillText(`For ${person.name},`, w / 2, h * 0.14, w * 0.85);
      ctx.font = `${Math.min(w * 0.025, h * 0.035)}px sans-serif`;
      ctx.fillText("WITH LOVE, ALWAYS", w / 2, h * 0.19);
      if (!scene) {
        ctx.fillStyle = "#34263d";
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#f5e1ac";
        ctx.font = `italic ${Math.min(w * 0.07, h * 0.045)}px Georgia`;
        wrap(
          ctx,
          story.closing,
          w / 2,
          h * 0.38,
          w * 0.8,
          Math.min(w * 0.09, h * 0.07),
        );
      }
    },
    dispose() {
      controller.abort();
      release();
      signal.removeEventListener("abort", cancel);
    },
  };
}
export type FilmSession = Awaited<ReturnType<typeof createFilmSession>>;
