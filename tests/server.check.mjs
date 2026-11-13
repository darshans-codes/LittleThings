import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
test("production companion confines requests and serves hardened assets", async () => {
  const child = spawn(process.execPath, ["server/index.mjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: "4189",
      KEEPSAKE_AI_ENABLED: "0",
      OLLAMA_MODEL: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await new Promise((resolve, reject) => {
      const t = setTimeout(
        () => reject(new Error("Server startup timed out")),
        10000,
      );
      child.stdout.once("data", () => {
        clearTimeout(t);
        resolve();
      });
      child.once("error", reject);
      child.once("exit", (code) => {
        if (code) reject(new Error(`Server exited ${code}`));
      });
    });
    const origin = "http://127.0.0.1:4189";
    const home = await fetch(origin);
    assert.equal(home.status, 200);
    assert.equal(home.headers.get("x-frame-options"), "DENY");
    assert.equal(home.headers.get("x-content-type-options"), "nosniff");
    assert.match(
      home.headers.get("content-security-policy"),
      /frame-ancestors 'none'/,
    );
    assert.match(await home.text(), /Keepsake/);
    assert.equal((await fetch(`${origin}/src/storage.ts`)).status, 404);
    assert.equal((await fetch(`${origin}/..%2fpackage.json`)).status, 403);
    assert.equal(
      (
        await fetch(`${origin}/api/director`, {
          method: "POST",
          headers: {
            origin: "https://other.example",
            "content-type": "application/json",
            "x-keepsake-request": "local-director",
          },
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${origin}/api/director`, {
          method: "POST",
          headers: {
            origin,
            "content-type": "application/json",
            "x-keepsake-request": "local-director",
          },
          body: "{}",
        })
      ).status,
      503,
    );
  } finally {
    child.kill();
  }
});
