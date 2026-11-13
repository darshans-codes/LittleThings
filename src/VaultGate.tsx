import { useEffect, useState, useRef, type ReactNode } from "react";
import { LockKeyhole, ShieldCheck, LoaderCircle } from "lucide-react";
import {
  createVault,
  unlockVault,
  vaultExists,
  lockVault,
  flushStorage,
} from "./storage";
export default function VaultGate({
  children,
}: {
  children: (lock: () => Promise<void>) => ReactNode;
}) {
  const [mode, setMode] = useState<
    "loading" | "setup" | "unlock" | "open" | "error"
  >("loading");
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  useEffect(() => {
    vaultExists()
      .then((exists) => setMode(exists ? "unlock" : "setup"))
      .catch(() => {
        setError(
          "Private storage is unavailable. Enable storage for this app, then reopen it.",
        );
        setMode("error");
      });
  }, []);
  async function lock() {
    setMode("unlock");
    setPassword("");
    setConfirm("");
    try {
      await flushStorage();
      lockVault();
    } catch {
      setError(
        "Your latest change could not be saved. Reopen the vault and check your draft.",
      );
      lockVault();
    }
  }
  useEffect(() => {
    if (mode !== "open") return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => {
          void lock();
        },
        5 * 60 * 1000,
      );
    };
    const hide = () => {
      if (document.visibilityState === "hidden" && modeRef.current === "open")
        void lock();
    };
    reset();
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [mode]);
  if (mode === "open") return children(lock);
  return (
    <main className="vault-page">
      <section className="vault-card">
        <div className="brand">
          <span className="brand-star">✳</span>keepsake.
        </div>
        <div className="vault-symbol">
          <LockKeyhole size={32} />
        </div>
        <div className="eyebrow">YOUR PEOPLE. YOUR PRIVATE SPACE.</div>
        <h1>
          {mode === "setup" ? (
            <>
              A little love.
              <br />
              <em>Safely kept.</em>
            </>
          ) : (
            <>
              Welcome back.
              <br />
              <em>Unlock your memories.</em>
            </>
          )}
        </h1>
        <p>
          {mode === "setup"
            ? "Create a passphrase to encrypt your people, photos, videos, and drafts. Existing local memories will be moved into this vault."
            : "Your passphrase unlocks this device’s encrypted vault. It is never sent to a server."}
        </p>
        {mode === "loading" ? (
          <LoaderCircle className="spin" />
        ) : (
          mode !== "error" && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (mode === "setup" && password !== confirm) {
                  setError("The passphrases do not match.");
                  return;
                }
                setBusy(true);
                setError("");
                try {
                  if (mode === "setup") await createVault(password);
                  else await unlockVault(password);
                  setPassword("");
                  setConfirm("");
                  setMode("open");
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Passphrase
                <input
                  autoFocus
                  type="password"
                  autoComplete={
                    mode === "setup" ? "new-password" : "current-password"
                  }
                  required
                  minLength={mode === "setup" ? 14 : 1}
                  maxLength={256}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              {mode === "setup" && (
                <>
                  <label>
                    Confirm passphrase
                    <input
                      type="password"
                      autoComplete="new-password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </label>
                  <p className="fine-print">
                    Use at least 14 characters. Keep it somewhere safe: we
                    cannot recover a forgotten passphrase. Existing plaintext
                    backups and files already exported remain outside the vault.
                  </p>
                </>
              )}
              <button className="button plum full" disabled={busy}>
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <LockKeyhole size={17} />
                )}{" "}
                {busy
                  ? "Opening your space…"
                  : mode === "setup"
                    ? "Create encrypted vault"
                    : "Unlock my memories"}
              </button>
            </form>
          )
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="privacy-inline">
          <ShieldCheck size={15} />
          Encrypted on this device · Locks when you leave
        </div>
      </section>
    </main>
  );
}
