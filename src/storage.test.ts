import "fake-indexeddb/auto";
import { openDB } from "idb";
import { describe, it, expect } from "vitest";
import { seed } from "./model";
import {
  createVault,
  loadState,
  saveState,
  unlockVault,
  lockVault,
  encryptedBackup,
  restoreBackup,
  flushStorage,
} from "./storage";
describe("vault migration, locking and recovery", () => {
  it("atomically migrates plaintext, persists ciphertext, and recovers an encrypted backup", async () => {
    const d = await openDB("keepsake-local", 1);
    const original = seed();
    original.people[0].name = "Private Test Person";
    await d.put("app", original, "state");
    await createVault("A test-only vault passphrase");
    expect(await d.get("app", "state")).toBeUndefined();
    const raw = await d.get("app", "vault");
    expect(raw.ciphertext).toBeTruthy();
    expect(JSON.stringify(raw)).not.toContain("Private Test Person");
    expect((await loadState())?.people[0].name).toBe("Private Test Person");
    const backup = await encryptedBackup(original);
    expect(await backup.text()).not.toContain("Private Test Person");
    lockVault();
    await expect(loadState()).rejects.toThrow("locked");
    await expect(saveState(original)).rejects.toThrow("locked");
    await expect(unlockVault("wrong password")).rejects.toThrow();
    await unlockVault("A test-only vault passphrase");
    original.people[0].name = "Updated private person";
    await saveState(original);
    await flushStorage();
    expect((await loadState())?.people[0].name).toBe("Updated private person");
    const restored = await restoreBackup(
      new File([backup], "backup.json"),
      "A test-only vault passphrase",
    );
    expect(restored.people[0].name).toBe("Private Test Person");
    await expect(
      restoreBackup(new File([backup], "backup.json"), "wrong password"),
    ).rejects.toThrow();
    d.close();
    lockVault();
  });
});
