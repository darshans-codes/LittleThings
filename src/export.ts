import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { Photo, Person, Story } from "./model";
import { createFilmSession, loadMedia } from "./film-session";
import { dimensions, cropRect } from "./film-timeline";
export { dimensions } from "./film-timeline";
function image(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error("A photo could not be loaded. Replace it and try again."),
      );
    img.src = src;
  });
}
function fit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLVideoElement,
  x: number,
  y: number,
  w: number,
  h: number,
  focalX = 0.5,
  focalY = 0.5,
) {
  const iw = img instanceof HTMLVideoElement ? img.videoWidth : img.width,
    ih = img instanceof HTMLVideoElement ? img.videoHeight : img.height;
  const crop = cropRect(iw, ih, w, h, focalX, focalY);
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, x, y, w, h);
}
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  line: number,
) {
  let current = "";
  let count = 0;
  for (const word of text.split(" ")) {
    if (ctx.measureText(current + word).width > width && current) {
      ctx.fillText(current.trim(), x, y + count++ * line);
      current = "";
    }
    current += word + " ";
  }
  ctx.fillText(current.trim(), x, y + count * line);
}
export async function makeCollage(
  person: Person,
  photos: Photo[],
  format: string,
  closing = "A little love. A lifetime of memories.",
): Promise<Blob> {
  const [w, h] = dimensions[format];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f7f2e9";
  ctx.fillRect(0, 0, w, h);
  const pad = w * 0.045;
  ctx.fillStyle = "#4b3653";
  ctx.textAlign = "center";
  ctx.font = `italic ${w * 0.065}px Georgia`;
  ctx.fillText(`Happy birthday, ${person.name}`, w / 2, h * 0.1, w - pad * 2);
  const chosen = photos.slice(0, 4);
  const images = await Promise.all(chosen.map((p) => image(p.poster || p.src)));
  if (!images.length) {
    ctx.font = `italic ${Math.min(w * 0.052, h * 0.05)}px Georgia`;
    ctx.fillStyle = "#775d79";
    wrap(
      ctx,
      closing,
      w / 2,
      h * 0.38,
      w * 0.76,
      Math.min(w * 0.075, h * 0.065),
    );
    ctx.font = `${w * 0.08}px Georgia`;
    ctx.fillText("♡", w / 2, h * 0.78);
  }
  const cols = images.length === 1 ? 1 : 2,
    rows = Math.ceil(images.length / cols);
  const cellW = (w - pad * (cols + 1)) / cols,
    cellH = (h * 0.7 - pad * (rows - 1)) / rows;
  images.forEach((img, i) =>
    fit(
      ctx,
      img,
      pad + (i % cols) * (cellW + pad),
      h * 0.16 + Math.floor(i / cols) * (cellH + pad),
      cellW,
      cellH,
      chosen[i].focalX,
      chosen[i].focalY,
    ),
  );
  ctx.font = `${w * 0.027}px sans-serif`;
  ctx.fillText("A little love. A lifetime of memories.", w / 2, h * 0.93);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not create collage."))),
      "image/png",
    ),
  );
}
export async function makeVideo(
  person: Person,
  photos: Photo[],
  story: Story,
  progress: (n: number) => void,
  signal: AbortSignal,
): Promise<Blob> {
  if (signal.aborted) throw new DOMException("Export cancelled", "AbortError");
  if (typeof MediaRecorder === "undefined")
    throw new Error(
      "Video export is unavailable here. Export a collage instead.",
    );
  const mimeType = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm",
  ].find((t) => MediaRecorder.isTypeSupported(t));
  if (!mimeType)
    throw new Error("No supported video encoder. Export a collage instead.");
  const [w, h] = dimensions[story.format];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  // Create and resume inside the export gesture; preparation does not start the film clock.
  const audio = new AudioContext();
  let session: Awaited<ReturnType<typeof createFilmSession>> | undefined;
  let stream: MediaStream | undefined;
  const destination = audio.createMediaStreamDestination();
  // A silent, active source keeps the recorder's audio clock running even in a photo-only film.
  const clock = audio.createConstantSource();
  clock.offset.value = 0;
  clock.connect(destination);
  clock.start();
  try {
    await audio.resume();
    session = await createFilmSession(person, photos, story, signal);
    if (signal.aborted)
      throw new DOMException("Export cancelled", "AbortError");
    session.connectAudio(audio, destination);
    session.sync(0, false, audio);
    session.draw(ctx, 0);
    stream = canvas.captureStream(30);
    const recorded = new MediaStream([
      ...stream.getVideoTracks(),
      ...destination.stream.getAudioTracks(),
    ]);
    const recorder = new MediaRecorder(recorded, {
      mimeType,
      videoBitsPerSecond: 5000000,
    });
    const film = session;
    const result = await new Promise<Blob>((resolve, reject) => {
      const chunks: Blob[] = [];
      let frame = 0,
        finished = false;
      const stop = () => {
        cancelAnimationFrame(frame);
        film.pause();
      };
      const fail = (error: unknown) => {
        if (finished) return;
        finished = true;
        stop();
        if (recorder.state !== "inactive") recorder.stop();
        reject(error);
      };
      const abort = () =>
        fail(new DOMException("Export cancelled", "AbortError"));
      const hidden = () => {
        if (document.visibilityState === "hidden")
          fail(
            new Error(
              "Export paused because the app left the screen. Your draft is safe; keep the app open and retry.",
            ),
          );
      };
      const remove = () => {
        signal.removeEventListener("abort", abort);
        document.removeEventListener("visibilitychange", hidden);
      };
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onerror = () => {
        remove();
        fail(
          new Error(
            "The encoder stopped unexpectedly. Retry or export a collage.",
          ),
        );
      };
      recorder.onstop = () => {
        remove();
        stop();
        if (!finished) {
          finished = true;
          if (!chunks.length)
            reject(
              new Error("The encoder produced an empty file. Please retry."),
            );
          else resolve(new Blob(chunks, { type: mimeType.split(";")[0] }));
        }
      };
      signal.addEventListener("abort", abort, { once: true });
      document.addEventListener("visibilitychange", hidden);
      if (signal.aborted) {
        remove();
        abort();
        return;
      }
      try {
        recorder.start(250);
      } catch (error) {
        remove();
        fail(error);
        return;
      }
      const start = performance.now();
      let lastFrame = start;
      const draw = () => {
        if (finished) return;
        try {
          const now = performance.now();
          if (now - lastFrame > 1500)
            throw new Error(
              "The device paused video rendering. Keep the app visible and retry, or export a collage.",
            );
          lastFrame = now;
          const seconds = Math.min((now - start) / 1000, story.duration);
          film.sync(seconds, seconds < story.duration, audio);
          film.draw(ctx, seconds);
          progress(seconds / story.duration);
          if (seconds >= story.duration) {
            film.pause();
            recorder.stop();
          } else frame = requestAnimationFrame(draw);
        } catch (error) {
          remove();
          fail(error);
        }
      };
      draw();
    });
    await verifyVideoDuration(result, story.duration, signal);
    return result;
  } finally {
    session?.dispose();
    stream?.getTracks().forEach((t) => t.stop());
    destination.stream.getTracks().forEach((t) => t.stop());
    clock.stop();
    clock.disconnect();
    await audio.close().catch(() => {});
  }
}

export async function verifyVideoDuration(
  blob: Blob,
  seconds: number,
  signal: AbortSignal,
) {
  const url = URL.createObjectURL(blob),
    video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  try {
    await loadMedia(video, url, signal);
    if (
      !Number.isFinite(video.duration) ||
      Math.abs(video.duration - seconds) > Math.max(0.75, seconds * 0.03)
    )
      throw new Error(
        "The recorded film did not retain its full length. Keep the app visible and retry, or export a collage.",
      );
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
export async function saveExport(blob: Blob, filename: string, share = false) {
  if (Capacitor.isNativePlatform()) {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const exportPath = `keepsake-share/keepsake-export-${crypto.randomUUID()}.${
      filename
        .split(".")
        .pop()
        ?.replace(/[^a-z0-9]/gi, "") || "bin"
    }`;
    const result = await Filesystem.writeFile({
      path: exportPath,
      data,
      directory: Directory.Cache,
      recursive: true,
    });
    await Share.share({
      title: "A little something for your birthday",
      files: [result.uri],
    });
    setTimeout(
      () => {
        void Filesystem.deleteFile({
          path: exportPath,
          directory: Directory.Cache,
        }).catch(() => {});
      },
      10 * 60 * 1000,
    );
    return;
  }
  const file = new File([blob], filename, { type: blob.type });
  if (share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: "Made with love" });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export async function clearTemporaryExports() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const result = await Filesystem.readdir({
      path: "keepsake-share",
      directory: Directory.Cache,
    });
    for (const file of result.files) {
      if (
        file.type === "file" &&
        /^keepsake-export-[a-f0-9-]+\.[a-z0-9]+$/i.test(file.name)
      )
        await Filesystem.deleteFile({
          path: `keepsake-share/${file.name}`,
          directory: Directory.Cache,
        });
    }
  } catch {
    /* A missing or inaccessible cache must not block vault access. */
  }
}
