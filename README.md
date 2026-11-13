# Keepsake / LittleThings

A private birthday assistant that edits real photographs and recorded videos. No synthetic scenes, face replacement or voice cloning.

## Run the private preview

Requires Node.js 24 and npm.

```sh
npm ci
npm run build
npm start
```

Open http://127.0.0.1:4173 and create a passphrase of at least 14 characters. This is an encrypted device-local vault; no password-reset service exists. Save an encrypted backup in Settings.

Existing development data at http://127.0.0.1:5173 belongs to a separate browser origin: migration happens when the upgraded app opens on that same origin. Browser and native stores do not share data automatically. `npm run dev` serves the development version on port 5173. Security tests should use `npm start`; the AI endpoint is available only on the production companion server, which binds exclusively to loopback.

## AI Director

The Director sends an approved text brief, selected file labels and captions to an optional local Ollama model. Media stays here. It proposes a sequence, mood, duration, format, captions and closing; users review before applying. It cannot see inside the photos and cannot introduce new media IDs. Pin memories to keep them included.

Install Ollama separately from its official source, download an instruction-following local model, and verify it runs. No model is downloaded automatically. Then, in PowerShell:

```powershell
$env:KEEPSAKE_AI_ENABLED = '1'
$env:OLLAMA_MODEL = 'YOUR_DOWNLOADED_LOCAL_MODEL_NAME'
npm start
```

The model name must match the local installation. Configure Ollama's own cloud and logging settings for local processing. The companion calls only http://127.0.0.1:11434/api/chat. Inference on a phone still needs an embedded or explicitly connected model integration; this companion is a desktop/local path. The manual editor works without AI.

## Working workflows

- Add/edit/remove people, relationships and birthdays; ordered upcoming occasions.
- Mandatory encrypted AES-256-GCM vault, passphrase unlock, background/inactivity locking, transactionally migrated old data, encrypted backups and validated restore.
- JPEG/PNG/WebP import, exact-duplicate detection and resolution flags. Real MP4/WebM clips under 40 MB and ten minutes; up to 100 items per import.
- Review, select, pin and reorder memories; four moods, captions and closing message; 30/45/60-second output and four aspect ratios.
- Real video playback, original clip audio, uploaded licensed music and recorded voice messages. Music is softened when a voice message is included.
- PNG collages from the first four photos/video posters, MP4/WebM films, and a text-led card fallback. Center crops and equal-time scene slots. Exports record in real time; keep the app foregrounded.
- Explicit sharing, dedicated native sharing cache and cleanup, privacy controls, reduced motion, mobile navigation and locally bundled fonts.

## Mobile and checks

```sh
npm test
npm run build
npm run mobile:sync
npm run mobile:android
```

Android Studio, the Android SDK and a compatible JDK are required. Native sources include cleartext blocking, backup/device-transfer exclusions, restricted shared-file paths and screenshot/task-preview protection. Native compilation, device testing and signed packaging remain required; no signed APK or iOS project is included.

CI runs tests, builds and a high-severity dependency audit. SECURITY.md describes protections and remaining release gates. This has not undergone independent certification or native acceptance testing.

Remaining product work includes measured face/confidence discovery, near-duplicate/blur/sensitive-content models, secure hosted contribution links, annual background scheduling, precise clip/narration timing, biometric/OS-key unlock and native-device acceptance. These are not represented as working services.

Sample photos are demonstration assets, not recognition results. Sources are in ASSETS.md. Real user memories and credentials must never be committed to this repository.
