# Privacy and security status

This development build implements encryption and release hardening. It has not passed an independent security assessment or native device acceptance testing. Do not market it as risk-free, zero-knowledge or certified.

## Implemented

- The mandatory passphrase vault uses Web Crypto AES-256-GCM with a fresh random 96-bit nonce per save and authenticated version context. PBKDF2-HMAC-SHA-256 uses 600,000 iterations and a random 128-bit vault salt. The non-extractable key stays in memory while unlocked, never alongside persisted ciphertext.
- Existing plaintext IndexedDB state is validated, encrypted and replaced transactionally. Failures do not silently substitute sample data. Previously downloaded plaintext backups and filesystem remnants cannot be retroactively erased.
- Backups are encrypted and validated before restoration. Restoring replaces current memories only after successful decryption. Forgotten passphrases cannot be recovered.
- The interface unmounts when backgrounded and after five idle minutes. Pending writes finish before dropping the session key. JavaScript and OS memory are not claimed to be securely wiped.
- No analytics, advertisements, external fonts or media-upload service is included. Production CSP confines requests to the app origin and local data/blob media. The development server omits CSP for hot reload; security testing must use the production build and companion.
- The optional AI companion binds only to 127.0.0.1. It checks Host/Origin, requires a custom request header and limits request size/time. AI is off by default. Approved text instructions, labels and captions go only to loopback Ollama; media bytes are never included. Configure Ollama itself for downloaded local models and disable cloud features/logging as appropriate. This is a desktop companion, not an embedded phone model.
- AI output is validated against allowed media IDs, length limits and export choices. Rendering uses only source photos and recorded video; no synthetic faces, scenes or voices are generated.
- Image imports are decoded/redrawn, and rendered exports are newly encoded. Original imported video metadata remains in the encrypted vault and is not uploaded.
- Native exports use unique names inside a dedicated sharing cache, with cleanup after ten minutes and at the next startup. Copies saved in another app are outside the vault.
- Android backup/device-transfer exclusions, cleartext blocking, restricted FileProvider paths, screenshot/task-preview protection and WebView file/content/mixed-content restrictions are configured.

## Remaining release gates

1. Biometric unlock and Android Keystore/iOS Keychain-bound wrapping are not implemented. Passphrase encryption is implemented. A compromised operating system or code executing inside an unlocked app can access decrypted data.
2. No native SDK/emulator/device acceptance run or signed APK has been produced here. Android media-picker/share/background lifecycle behavior must be tested. No iOS native project is included.
3. No local AI model is installed here. Consent, connector, validation and failure handling are integrated; real inference must be tested once a downloaded model is connected. A simulated response is not a model test.
4. Measured face/confidence discovery, near-duplicate/blur/sensitive-content models, secure hosted contribution links and annual background scheduling are not implemented. No insecure imitation of those services is shipped.
5. Codec compatibility, export cancellation and audio playback require a supported-device matrix. Clips play in equal-time scene slots; frame-level trimming and precise narration timing remain future work.
6. Browser storage can be evicted. Keep an encrypted backup. There is no server account or forgotten-password reset. App-side deletion cannot erase exported copies or guarantee forensic erasure of browser/OS storage.
7. Complete privacy/store disclosures, a data inventory and independent testing against OWASP MASVS/MASTG before distribution. This file is a technical disclosure, not a jurisdiction-specific privacy policy.

## Automated verification

Tests cover authenticated encryption round trips, wrong-password and tamper rejection, nonce uniqueness, schema validation, atomic legacy migration, locked-storage rejection, encrypted backup recovery, AI-plan constraints and birthday scheduling. These do not replace penetration testing or native device verification.

Report vulnerabilities privately to the repository owner. Never include real photos, passphrases, decrypted backups or tokens in public issues.
