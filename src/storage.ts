import { openDB } from "idb";
import type { State } from "./model";
import { seed } from "./model";
import {
  decryptVault,
  deriveVaultKey,
  encryptVault,
  unbase64,
  validateEnvelope,
  type Envelope,
} from "./vault-crypto";
import { validateState } from "./validation";
const db = openDB("keepsake-local", 1, {
  upgrade(d) {
    d.createObjectStore("app");
  },
});
let session: { key: CryptoKey; salt: Uint8Array } | undefined;
let queue: Promise<void> = Promise.resolve();
export async function vaultExists() {
  return !!(await (await db).get("app", "vault"));
}
export async function createVault(password: string) {
  if (password.length < 14)
    throw new Error(
      "Use at least 14 characters. A few unrelated words work well.",
    );
  if (await vaultExists())
    throw new Error("A vault already exists. Unlock it first.");
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    key = await deriveVaultKey(password, salt);
  const legacy = await (await db).get("app", "state");
  const state = legacy || seed();
  validateState(state);
  const envelope = await encryptVault(state, key, salt);
  const tx = (await db).transaction("app", "readwrite");
  await tx.store.put(envelope, "vault");
  await tx.store.delete("state");
  await tx.done;
  session = { key, salt };
}
export async function unlockVault(password: string) {
  const envelope = await (await db).get("app", "vault");
  validateEnvelope(envelope);
  const salt = unbase64(envelope.salt),
    key = await deriveVaultKey(password, salt);
  let state: unknown;
  try {
    state = await decryptVault(envelope, key);
  } catch {
    throw new Error(
      "Could not unlock. Check your passphrase, or restore an undamaged backup.",
    );
  }
  validateState(state);
  session = { key, salt };
}
export async function loadState(): Promise<State | undefined> {
  if (!session) throw new Error("Vault is locked.");
  const envelope = await (await db).get("app", "vault");
  if (!envelope) return undefined;
  const value = await decryptVault(envelope, session.key);
  validateState(value);
  return value;
}
export function saveState(state: State): Promise<void> {
  const active = session;
  if (!active) return Promise.reject(new Error("Vault is locked."));
  const result = queue
    .catch(() => {})
    .then(async () => {
      validateState(state);
      const envelope = await encryptVault(state, active.key, active.salt);
      await (await db).put("app", envelope, "vault");
    });
  queue = result;
  return result;
}
export async function flushStorage() {
  await queue;
}
export function lockVault() {
  session = undefined;
}
export async function encryptedBackup(state: State) {
  if (!session) throw new Error("Unlock first.");
  validateState(state);
  return new Blob(
    [JSON.stringify(await encryptVault(state, session.key, session.salt))],
    { type: "application/json" },
  );
}
export async function restoreBackup(
  file: File,
  password: string,
): Promise<State> {
  if (file.size > 140 * 1024 * 1024)
    throw new Error("Backup is too large for this device workflow.");
  const e: Envelope = JSON.parse(await file.text());
  validateEnvelope(e);
  const key = await deriveVaultKey(password, unbase64(e.salt));
  let value: unknown;
  try {
    value = await decryptVault(e, key);
  } catch {
    throw new Error("The backup password is incorrect or the file is damaged.");
  }
  validateState(value);
  return value;
}
export async function clearState() {
  if (!session) throw new Error("Unlock first.");
  await saveState({ ...seed(), people: [], photos: [], stories: [] });
}

export async function importImage(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG, or WebP photo.");
  if (file.size > 30 * 1024 * 1024)
    throw new Error(`${file.name} is larger than 30 MB.`);
  const bytes = await file.arrayBuffer();
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  const bitmap = await createImageBitmap(file);
  if (bitmap.width * bitmap.height > 60_000_000) {
    bitmap.close();
    throw new Error("This photo is too large to decode safely.");
  }
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const small = Math.min(bitmap.width, bitmap.height) < 350;
  bitmap.close();
  return {
    src: canvas.toDataURL("image/jpeg", 0.88),
    hash,
    reason: small ? "Low resolution — review before using" : undefined,
  };
}
export function fileData(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
export async function importVideo(file: File) {
  if (
    !["video/mp4", "video/webm"].includes(file.type) ||
    file.size > 40 * 1024 * 1024
  )
    throw new Error("Choose MP4 or WebM video under 40 MB.");
  const url = URL.createObjectURL(file),
    video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Video could not be opened")),
        15000,
      );
      video.onloadeddata = () => {
        clearTimeout(timeout);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Unsupported video"));
      };
    });
    if (!Number.isFinite(video.duration) || video.duration > 600)
      throw new Error("Choose a clip shorter than ten minutes.");
    const canvas = document.createElement("canvas"),
      scale = Math.min(1, 800 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    canvas
      .getContext("2d")!
      .drawImage(video, 0, 0, canvas.width, canvas.height);
    const hash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
      ),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    return {
      src: await fileData(file),
      poster: canvas.toDataURL("image/jpeg", 0.8),
      kind: "video" as const,
      hash,
      reason: undefined,
    };
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
