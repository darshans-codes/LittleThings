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

The Director sends an approved text brief, selected file labels, captions and clip lengths to an optional local Ollama model. Media stays here. It proposes a sequence, mood, duration, format, captions, closing and optional clip trims within known source durations. Users review before applying. It cannot see inside the photos and cannot introduce new media IDs. Pin memories to keep them included. Editing the brief, consent, source selection or film settings cancels stale requests/plans. Plan application can be undone in the current editor session.

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
- JPEG/PNG/WebP import, exact duplicates, perceptual similarity, resolution, possible blur and exposure review hints. These heuristics need real-photo evaluation and do not detect identity or sensitive content. Real MP4/WebM clips under 40 MB and ten minutes; up to 100 items per import.
- Review, select, pin and reorder memories; four moods, captions and closing message; 30/45/60-second output and four aspect ratios.
- Real video playback, non-destructive clip in/out points, original clip audio, uploaded licensed music, adjustable music level and recorded voice start timing. Music lowers while the voice plays and fades at the film edges. Short clips hold their final frame within their scene slot.
- PNG collages from the first four photos/video posters, MP4/WebM films, and a text-led card fallback. Manual focal framing, weighted scene pacing, soft dissolve/clean cut, and a reserved closing scene. Preview and export use the same renderer and audio mix. Final review plays the actual encoded file. Exports record in real time; keep the app foregrounded. An active silent audio clock supports photo-only recording; paused rendering or a mismatched output duration produces a retry error instead of a ready file.
- Explicit sharing, dedicated native sharing cache and cleanup, privacy controls, reduced motion, mobile navigation and locally bundled fonts.
- Opt-in Celebration Autopilot prepares one private draft per upcoming occasion when the app is opened or active. It uses selected, unflagged or explicitly reviewed memories, skips samples, preserves manual drafts, and offers a personal card when photos are missing. Director edits can be undone in the current editor session.
- Opt-in Android/iOS local notifications with generic text and no person identifiers. The operating system stores delivery dates outside the vault. Up to 60 upcoming preparation/birthday reminders are refreshed on unlock or birthday/preference changes. Delivery is controlled by the device; rendering does not run while the vault is locked.

## Mobile and checks

```sh
npm test
npm run build
npm run mobile:sync
npm run mobile:android
```

Android Studio, the Android SDK and JDK 21 are required for Android. Native Android sources include cleartext blocking, backup/device-transfer exclusions, restricted shared-file paths and screenshot/task-preview protection. The iOS Swift Package Manager project is included; run `npm ci`, `npm run mobile:sync`, then `npm run mobile:ios` on a Mac with Xcode. On Windows, Capacitor can generate backslashes in Package.swift paths; syncing on the Mac regenerates the correct paths. iOS device installation/TestFlight requires Apple signing configuration. Android protections have not all been implemented or validated on iOS.

The Mobile builds GitHub workflow builds a debug APK and checks an unsigned iOS Simulator build. An unsigned Simulator build cannot be installed on an iPhone. These jobs must run successfully before claiming native compilation is verified. Real-device testing and signed packaging remain required.

CI runs tests, builds and a high-severity dependency audit. SECURITY.md describes protections and remaining release gates. This has not undergone independent certification or native acceptance testing.

Remaining product work includes measured face/confidence discovery, validated quality/sensitive-content models, secure hosted contribution links, mobile model inference, advanced transitions/beat synchronization, scalable encrypted media storage, biometric/OS-key unlock and native-device acceptance. Current media storage is a bounded encrypted snapshot, not a production-scale camera-roll library. Local notifications prompt preparation on open; they do not silently render while locked.

Sample photos are demonstration assets, not recognition results. Sources are in ASSETS.md. Real user memories and credentials must never be committed to this repository.
