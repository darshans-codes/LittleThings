export type Envelope = {
  version: 1;
  algorithm: "AES-GCM";
  iterations: 600000;
  salt: string;
  iv: string;
  ciphertext: string;
};
const encoder = new TextEncoder();
export function base64(bytes: Uint8Array): string {
  let result = "";
  for (let i = 0; i < bytes.length; i += 8192)
    result += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(result);
}
export function unbase64(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
export async function deriveVaultKey(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 600000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptVault(
  value: unknown,
  key: CryptoKey,
  salt: Uint8Array,
): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext=encoder.encode(JSON.stringify(value));
  if(plaintext.byteLength>90*1024*1024)throw new Error('This vault is too large for safe backup recovery. Remove some media and retry.');
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      additionalData: encoder.encode("Keepsake vault v1"),
    },
    key,
    plaintext,
  );
  return {
    version: 1,
    algorithm: "AES-GCM",
    iterations: 600000,
    salt: base64(salt),
    iv: base64(iv),
    ciphertext: base64(new Uint8Array(ciphertext)),
  };
}
export function validateEnvelope(value: unknown): asserts value is Envelope {
  const e = value as Envelope;
  if (
    !e ||
    e.version !== 1 ||
    e.algorithm !== "AES-GCM" ||
    e.iterations !== 600000 ||
    typeof e.salt !== "string" ||
    typeof e.iv !== "string" ||
    typeof e.ciphertext !== "string" ||
    e.ciphertext.length > 180_000_000 ||
    unbase64(e.salt).length !== 16 ||
    unbase64(e.iv).length !== 12
  )
    throw new Error("This is not a supported encrypted Keepsake backup.");
}
export async function decryptVault(
  envelope: Envelope,
  key: CryptoKey,
): Promise<unknown> {
  validateEnvelope(envelope);
  const value = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: unbase64(envelope.iv) as BufferSource,
      additionalData: encoder.encode("Keepsake vault v1"),
    },
    key,
    unbase64(envelope.ciphertext) as BufferSource,
  );
  return JSON.parse(new TextDecoder().decode(value));
}
