# Phone acceptance testing

Use consenting participants and disposable copies for the first run. Both Android and iPhone need acceptance testing; a successful web build is not native acceptance.

## Android

On a machine with Android SDK and JDK 21, run `npm ci`, `npm run mobile:sync`, open Android Studio with `npm run mobile:android`, and build/install on a USB-connected device. Alternatively, after the Mobile builds GitHub workflow passes, download the debug APK from its artifact. Debug builds are for testing, not public distribution.

## iPhone

On a Mac with Xcode, run `npm ci`, `npm run mobile:sync`, and `npm run mobile:ios`. Select your Apple signing team and connected iPhone, then run. Simulator builds do not prove real-device imports, notifications, sharing, or video encoding. TestFlight distribution needs Apple Developer configuration and a signed archive.

## Acceptance sequence

1. Create a vault, save a person, close/reopen the app, and unlock. Check wrong-passphrase handling and an encrypted backup restore.
2. Import real portrait/landscape photos, a duplicate, similar photos, a dark/bright photo, and MP4/WebM clips. Review hints and deliberately approve a flagged photo. Originals must remain unchanged.
3. Check picker return/cancellation and vault locking. Switching apps or locking the phone must conceal memories; an interrupted import/export must remain recoverable without corrupting saved data.
4. Trim a clip, adjust horizontal/vertical framing and pacing, change captions and order, pin a memory, choose dissolve/cut, add music and a recorded message, set voice start time, and export all four formats. Compare the shared film preview with the actual encoded file shown in final review. Listen for voice/music timing and verify trimmed content and the closing frame. A 30-second export must retain its full duration; backgrounding/stalling must give a recoverable error rather than a short ready file. After editing, the previous export must be cleared.
5. Enable Autopilot for an upcoming real person. Reopen the app and verify one draft, a card fallback with no photos, and preservation of a manually edited draft.
6. Enable device reminders, check the OS permission prompt and generic text, edit/remove birthdays, disable reminders, and confirm pending reminders update. Notification delivery can be delayed by the OS.
7. Check reduced motion, large text, keyboard avoidance, screen reader labels, narrow screens, low storage, and denied permissions.

The optional Director currently requires a configured desktop local model. Mobile inference, person recognition, secure contribution links, biometric protection, and professional rendering remain release gates. Record device/OS version and reproduction steps for failures without attaching private media to public issues.
