import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import type { Photo, Person, Story } from "./model";
export const dimensions: Record<string, [number, number]> = {
  Story: [720, 1280],
  Square: [1080, 1080],
  Feed: [864, 1080],
  Landscape: [1280, 720],
};
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
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale,
    sh = h / scale;
  ctx.drawImage(
    img,
    (img.width - sw) / 2,
    (img.height - sh) / 2,
    sw,
    sh,
    x,
    y,
    w,
    h,
  );
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
  const images = await Promise.all(chosen.map((p) => image(p.src)));
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
  if (typeof MediaRecorder === "undefined")
    throw new Error(
      "Video export is not supported here. Try Chrome or export a collage.",
    );
  const mimeType = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm",
  ].find((t) => MediaRecorder.isTypeSupported(t));
  if (!mimeType)
    throw new Error("No supported video encoder. Export a collage instead.");
  const [w, h] = dimensions[story.format];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const imgs = await Promise.all(photos.map((p) => image(p.src)));
  const stream = canvas.captureStream(30),
    recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5000000,
    });
  const chunks: Blob[] = [];
  return new Promise((resolve, reject) => {
    let frame = 0,
      settled = false;
    const start = performance.now();
    function cleanup() {
      cancelAnimationFrame(frame);
      stream.getTracks().forEach((t) => t.stop());
      signal.removeEventListener("abort", abort);
    }
    function abort() {
      if (settled) return;
      settled = true;
      if (recorder.state !== "inactive") recorder.stop();
      cleanup();
      reject(new DOMException("Export cancelled", "AbortError"));
    }
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    recorder.onerror = () => {
      settled = true;
      cleanup();
      reject(new Error("Video recording failed. Please retry."));
    };
    recorder.onstop = () => {
      cleanup();
      if (!settled) {
        settled = true;
        resolve(new Blob(chunks, { type: mimeType.split(";")[0] }));
      }
    };
    signal.addEventListener("abort", abort);
    if (signal.aborted) {
      abort();
      return;
    }
    recorder.start(250);
    function draw() {
      const elapsed = (performance.now() - start) / 1000,
        t = Math.min(elapsed / story.duration, 1);
      progress(t);
      ctx.fillStyle = "#34263d";
      ctx.fillRect(0, 0, w, h);
      if (imgs.length) {
        const position = t * imgs.length,
          i = Math.min(Math.floor(position), imgs.length - 1),
          zoom = 1 + (position % 1) * 0.035;
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(zoom, zoom);
        fit(ctx, imgs[i], -w / 2, -h / 2, w, h);
        ctx.restore();
        const g = ctx.createLinearGradient(0, h * 0.3, 0, h);
        g.addColorStop(0, "transparent");
        g.addColorStop(1, "rgba(25,17,29,.9)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = `${Math.min(w * 0.037, h * 0.038)}px sans-serif`;
        wrap(
          ctx,
          photos[i].caption,
          w / 2,
          h * 0.76,
          w * 0.8,
          Math.min(w * 0.055, h * 0.05),
        );
      }
      ctx.fillStyle = "#fff5df";
      ctx.textAlign = "center";
      ctx.font = `italic ${w * 0.073}px Georgia`;
      ctx.fillText(`For ${person.name},`, w / 2, h * 0.14, w * 0.85);
      ctx.font = `${w * 0.025}px sans-serif`;
      ctx.fillText("WITH LOVE, ALWAYS", w / 2, h * 0.19);
      if (t > 0.88 || !imgs.length) {
        ctx.fillStyle = "rgba(47,33,52,.94)";
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
      if (t < 1) frame = requestAnimationFrame(draw);
      else recorder.stop();
    }
    draw();
  });
}
export async function saveExport(blob: Blob, filename: string, share = false) {
  if (Capacitor.isNativePlatform()) {
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const result = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Cache,
    });
    await Share.share({
      title: "A little something for your birthday",
      files: [result.uri],
    });
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
