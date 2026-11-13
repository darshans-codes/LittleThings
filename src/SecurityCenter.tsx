import { useRef, useState } from "react";
import { LockKeyhole, Download, Upload, ShieldCheck } from "lucide-react";
import type { State } from "./model";
import { encryptedBackup, restoreBackup, saveState } from "./storage";
import { saveExport } from "./export";
export default function SecurityCenter({
  state,
  onRestore,
  onLock,
}: {
  state: State;
  onRestore: (s: State) => void;
  onLock: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [file, setFile] = useState<File>(),
    [password, setPassword] = useState("");
  const input = useRef<HTMLInputElement>(null);
  return (
    <section className="settings-card privacy-center">
      <ShieldCheck size={27} />
      <h2>Your private vault.</h2>
      <p>
        People, imported media, and drafts are encrypted with your passphrase.
        Your key stays in memory while unlocked. The vault locks when you leave,
        or after five minutes without activity.
      </p>
      <div className="setting-row">
        <span>
          Media uploads
          <small>No photo or video uploads; processing stays here</small>
        </span>
        <span className="soft-tag">Off</span>
      </div>
      <div className="setting-row">
        <span>
          Tracking and advertising
          <small>No analytics, ad identifiers, or third-party fonts</small>
        </span>
        <span className="soft-tag">Off</span>
      </div>
      <button
        className="button plum full"
        disabled={busy}
        onClick={() => void onLock()}
      >
        <LockKeyhole size={16} />
        Lock my space
      </button>
      <button
        className="button outline full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await saveState(state);
            await saveExport(
              await encryptedBackup(state),
              "keepsake-encrypted-backup.json",
            );
          } catch {
            setError("Backup could not be saved. Please retry.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Download size={16} />
        Save encrypted backup
      </button>
      <button
        className="button outline full"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        <Upload size={16} />
        Restore encrypted backup
      </button>
      <input
        hidden
        type="file"
        accept="application/json,.json"
        ref={input}
        onChange={(e) => {
          setFile(e.target.files?.[0]);
          e.target.value = "";
          setError("");
        }}
      />
      {file && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const restored = await restoreBackup(file, password);
              await saveState(restored);
              onRestore(restored);
              setPassword("");
              setFile(undefined);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <p>
            Restore replaces the current people and drafts. Save an encrypted
            backup first if you want to keep them.
          </p>
          <label>
            Backup passphrase
            <input
              required
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="button plum full" disabled={busy}>
            Decrypt and replace my vault
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setFile(undefined);
              setPassword("");
            }}
          >
            Cancel restore
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      <p className="fine-print">
        Saved exports and copies shared with another app are outside this vault.
        Removing an item does not erase those external copies. Device or browser
        clearing can remove the vault: keep an encrypted backup. Passphrases
        cannot be recovered.
      </p>
    </section>
  );
}
