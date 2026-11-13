# Keepsake

A mobile-first birthday celebration app, with a responsive development preview and a Capacitor Android foundation.

## Run

Requires Node.js 22+.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. Use a narrow browser window to preview the phone layout.

```sh
npm run test
npm run build
npm run mobile:sync
npm run mobile:android
```

Android Studio and its SDK are required to compile/install the Android application. No signed APK or store release is included. iOS packaging requires a Mac and an iOS platform project.

## Working in this release

- Add, edit and remove people, relationships and birthdays; upcoming birthday ordering, including leap-day handling.
- User-selected image import. Photos resize locally to at most 1,600 pixels; original files remain untouched.
- SHA-256 exact-duplicate detection and low-resolution flagging; explicit manual photo selection.
- Four story moods, editable captions and closing message, photo reordering, 30/45/60-second duration choices, four aspect ratios, and a text-led card fallback when no photos are available.
- Persistent local IndexedDB people, images and drafts, with visible save failures.
- PNG collage export (first four selected images) and silent video export (all selected images, recorded in real time). Browser encoder determines MP4 or WebM availability.
- Download and supported system file sharing. Native sharing uses cache files through Capacitor.
- Settings, sample removal, private JSON backup download, explicit local-data erasure, modal keyboard trapping, reduced-motion handling and responsive phone navigation.

## Deliberately not represented as complete

Face recognition, confidence-ranked identity discovery, near-duplicate and blur detection, sensitive-content filtering, cloud sync, automatic annual/background preparation, scheduled notifications, licensed music, voice recording/mixing, secure contribution links, undo/redo, manual crop positioning, backup restoration, platform-specific WhatsApp/Instagram integrations, production encryption and store builds are not implemented. The first version explicitly describes these limits rather than presenting fake AI results or nonfunctional collaboration links.

Current editing automatically saves as a device-local draft. Style changes replace selected photo captions with grounded suggestions. Every export requires explicit creation and saving/sharing. Native and web stores are separate; browser clearing/uninstallation can remove drafts. No backup is uploaded automatically.

The Android foundation uses an embedded web interface. Native device testing, lifecycle handling and store privacy declarations are required before release. Export must remain in the foreground; the browser/native WebView must support MediaRecorder and canvas capture. Center crops should be checked by the user before sharing.

## Design and assets

Warm ivory, plum, sage and soft rose; editorial serif accents; image-led cards; restrained interface motion. Sample photographs from Unsplash are bundled for demonstration. No sample photograph is a face-recognition result. DM Sans and Manrope fonts are bundled locally through Fontsource; the app does not request external font services. See `ASSETS.md` for source URLs.

## Next build priorities

1. Device testing and native photo-picker integration; background-safe processing jobs.
2. Recovery/undo and importable backups.
3. On-device identity and quality models with a measured confidence-review workflow.
4. Professional deterministic rendering with licensed music and voice mixing.
5. Authenticated, expiring private contribution links with server-side access control.

No third-party API credentials are required for the current build.
