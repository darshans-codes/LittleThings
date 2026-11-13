import { openDB } from "idb";
import type { State } from "./model";
const db = openDB("keepsake-local", 1, {
  upgrade(d) {
    d.createObjectStore("app");
  },
});
export async function loadState(): Promise<State | undefined> {
  return (await db).get("app", "state");
}
export async function saveState(state: State) {
  await (await db).put("app", state, "state");
}
export async function clearState() {
  await (await db).delete("app", "state");
}

export async function importImage(file: File) {
  if (!file.type.startsWith("image/"))
    throw new Error("Choose a JPG, PNG, or WebP photo.");
  if (file.size > 30 * 1024 * 1024)
    throw new Error(`${file.name} is larger than 30 MB.`);
  const bytes = await file.arrayBuffer();
  const hash = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  const bitmap = await createImageBitmap(file);
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
