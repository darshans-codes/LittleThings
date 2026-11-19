export type Quality = {
  fingerprint: string;
  brightness: number;
  sharpness: number;
  issues: string[];
};

// Relative visual similarity and quality hints, never identity or safety scores.
export function analyzePixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Quality {
  const gray = Array.from(
    { length: width * height },
    (_, i) =>
      data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114,
  );
  const brightness = gray.reduce((a, b) => a + b, 0) / gray.length;
  let sum = 0,
    squares = 0,
    n = 0;
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const v =
        gray[i - 1] +
        gray[i + 1] +
        gray[i - width] +
        gray[i + width] -
        4 * gray[i];
      sum += v;
      squares += v * v;
      n++;
    }
  const sharpness = n ? squares / n - (sum / n) ** 2 : 0;
  let fingerprint = "";
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const row = Math.min(height - 1, Math.floor(((y + 0.5) * height) / 8));
      const a = Math.min(width - 1, Math.floor((x * width) / 9));
      const b = Math.min(width - 1, Math.floor(((x + 1) * width) / 9));
      fingerprint += gray[row * width + a] > gray[row * width + b] ? "1" : "0";
    }
  const issues: string[] = [];
  if (brightness < 35) issues.push("Very dark — review exposure");
  if (brightness > 225) issues.push("Very bright — review exposure");
  if (sharpness < 65) issues.push("Possibly soft or blurry — review");
  return { fingerprint, brightness, sharpness, issues };
}

export function similarFingerprint(a?: string, b?: string) {
  if (!a || !b || a.length !== 64 || b.length !== 64) return false;
  // Uniform images have little useful similarity information.
  if ([a, b].some((s) => !s.includes("0") || !s.includes("1"))) return false;
  return [...a].reduce((n, bit, i) => n + Number(bit !== b[i]), 0) <= 5;
}

export function analyzeCanvas(source: HTMLCanvasElement): Quality {
  const sample = document.createElement("canvas");
  sample.width = 96;
  sample.height = 96;
  const ctx = sample.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(source, 0, 0, 96, 96);
  return analyzePixels(ctx.getImageData(0, 0, 96, 96).data, 96, 96);
}
