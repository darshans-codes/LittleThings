import { describe, it, expect } from "vitest";
import {
  deriveVaultKey,
  encryptVault,
  decryptVault,
  unbase64,
  base64,
  validateEnvelope,
} from "./vault-crypto";
import { validateState } from "./validation";
import { seed } from "./model";
import { validatePlan } from "./edit-plan.mjs";
describe("encrypted vault boundary", () => {
  it("round trips personal data without exposing it in the envelope", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16)),
      key = await deriveVaultKey("test-only long passphrase", salt);
    const data = { name: "PRIVATE_PERSON", image: "PRIVATE_IMAGE" };
    const e = await encryptVault(data, key, salt);
    expect(JSON.stringify(e)).not.toContain("PRIVATE");
    expect(await decryptVault(e, key)).toEqual(data);
    expect(key.extractable).toBe(false);
  });
  it("uses a fresh nonce and ciphertext for each save", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16)),
      key = await deriveVaultKey("test-only long passphrase", salt);
    const a = await encryptVault("data", key, salt),
      b = await encryptVault("data", key, salt);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });
  it("rejects the wrong passphrase and modified ciphertext", async () => {
    const salt = crypto.getRandomValues(new Uint8Array(16)),
      key = await deriveVaultKey("correct test-only passphrase", salt),
      wrong = await deriveVaultKey("incorrect test-only passphrase", salt),
      e = await encryptVault({ private: "yes" }, key, salt);
    await expect(decryptVault(e, wrong)).rejects.toThrow();
    const bytes = unbase64(e.ciphertext);
    bytes[0] ^= 1;
    await expect(
      decryptVault({ ...e, ciphertext: base64(bytes) }, key),
    ).rejects.toThrow();
  });
  it("rejects manipulated algorithm, work factor and nonce", () => {
    expect(() =>
      validateEnvelope({
        version: 1,
        algorithm: "AES-GCM",
        iterations: 1,
        salt: "",
        iv: "",
        ciphertext: "",
      }),
    ).toThrow();
  });
});
describe("untrusted imports and AI plans", () => {
  it("accepts the existing sample data for migration", () =>
    expect(() => validateState(seed())).not.toThrow());
  it("rejects external tracking URLs in backup media", () => {
    const s = seed();
    s.photos[0].src = "https://example.com/tracker.jpg";
    expect(() => validateState(s)).toThrow();
  });
  it("rejects scripts and unsupported media from backups", () => {
    const s = seed();
    s.photos[0].src = 'data:image/svg+xml,<svg onload="alert(1)">';
    expect(() => validateState(s)).toThrow();
  });
  const plan = {
    summary: "A natural birthday film",
    tone: "Emotional",
    duration: 30,
    format: "Story",
    sequence: ["p1"],
    captions: [{ id: "p1", text: "A moment worth keeping." }],
    closing: "Happy birthday.",
  };
  it("accepts a grounded plan over supplied media", () =>
    expect(validatePlan(plan, ["p1"])).toEqual(plan));
  it("rejects fabricated media and duplicated scenes", () => {
    expect(() =>
      validatePlan({ ...plan, sequence: ["fake"] }, ["p1"]),
    ).toThrow();
    expect(() =>
      validatePlan({ ...plan, sequence: ["p1", "p1"] }, ["p1"]),
    ).toThrow();
  });
  it("rejects unsupported export values and excessive text", () => {
    expect(() => validatePlan({ ...plan, duration: 999 }, ["p1"])).toThrow();
    expect(() =>
      validatePlan({ ...plan, closing: "x".repeat(201) }, ["p1"]),
    ).toThrow();
  });
});
