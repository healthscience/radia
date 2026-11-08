# Radia

Radia is a conduction instrument app for the body: a React Native bare-js app
that embeds `@conduction/medulla`, accesses the mobile camera for posture
optics, and couples with peer BentoBoxDS HOP accounts.

## Architecture

```
radia (React Native / Expo app)   @conduction/medulla (bare worklet)
────────────────────────────     ──────────────────────────────────
  host/App.js                       medulla.mjs -> medulla.bundle
  host/medulla-rpc.js               - Ed25519 instrument identity
  host/screens.js                   - append-only Hyperbee ledger
  src/contracts.js                  - Hyperdrive image store (photos)
  src/overlay.js                    - COUPLE / VERIFY / INGRESS / EGRESS
  src/photo.js                      - SAVE_PHOTO / GET_PHOTO / LIST_PHOTOS
  src/history.js                    - ACL + anti-replay + signatures
  tests/                            - osmosis to BentoBoxDS

Camera, gyro, QR UI, user prompts   Crypto, P2P, storage
live on the host thread.             Private key NEVER leaves the worklet.
```

## Features

- Live rear-camera posture overlay (expo-camera) with draggable body keypoints
  and a DeviceOrientation tilt gauge.
- Posture vector extraction producing the `exoCue-cameraOverlay-v1` contract:
  `slendernessIndex`, `appendicularRatio`, `gelleAspectProfile` and
  `orreryStrainCoefficients`.
- Face close-up mode producing the new `exoCue-cameraOverlay-face-v1` contract
  with `facialIndex`, `ocularIndex`, `nasalIndex`, `mouthIndex`.
- Authenticated capture: the frame bytes are saved to the Hyperdrive image
  store (`SAVE_PHOTO`) and the overlay-data contract (radia units) is committed
  to the Hyperbee ledger (`INGRESS_TELEMETRY`), linked by id so a peer can
  move the ratio lines against the image.
- QR coupling to a BentoBoxDS HOP prime account and self-verification
  (`COUPLE` / `VERIFY`) — the private key never leaves the worklet.
- History grouped by great orbit (calendar year), with "N great orbits ago".
- Osmosis to BentoBoxDS (stubbed hook on the host; the worklet owns the path).

## Screen flow

```
Boot -> Setup/Couple -> Capture -> History -> Face close-up
```

- **Boot** — wait for `MEDULLA_READY`; if a coupling record exists, self-verify
  the private key to sign back in (`VERIFY`).
- **Setup/Couple** — camera permission gate, render the `conduction-couple` QR
  (public key only), confirm, `COUPLE`.
- **Capture** — live preview + overlay + ratio lines; **Take Photo** saves the
  frame to Hyperdrive and commits the overlay-data contract to the ledger.
- **History** — captures grouped by great orbit (calendar year).
- **Face close-up** — face keypoints + face ratios overlay, new contract.

## Requirements

- Node >= 18 (tested on Node 24).
- npm / node_modules present (`npm install`).
- For a real device build: Android SDK + a connected Android device with USB
  debugging, or Xcode + a connected iOS device. The unit tests run on plain
  Node with no device.

## Quick start (unit tests — no device)

```bash
cd radia
npm test
```

Runs vitest: `tests/contracts.test.js`, `tests/overlay.test.js`,
`tests/history.test.js`, `tests/photo.test.js`, `tests/posture-sensors.test.js`
and `tests/medulla-ipc.test.js` (35 tests). The sensor hooks degrade gracefully
when `expo-camera` / `react-native-sensors` native modules are absent, so the
tests run on Node without a phone.

## Build & run on a device

```bash
cd radia
npm install            # Expo toolchain + native deps
npx expo prebuild      # generates android/ (and ios/) native project
npx expo run:android  # build + install on a connected USB device
```

On first run, grant camera permission, align the device (pitch ~90, roll ~0),
drag the keypoints onto your body, then tap **Take Photo** to save a capture.

## Layout

```
radia/
├── app.json                # Expo app config
├── medulla.bundle          # vendored bare worklet asset
├── vitest.config.js
├── host/
│   ├── App.js              # screen orchestration
│   ├── medulla-rpc.js      # Worklet RPC hook (id correlation, timeout)
│   └── screens.js          # Boot / Setup / Capture / History / Face
├── src/
│   ├── contracts.js        # body + face contract builders
│   ├── overlay.js          # keypoint models + ratio-line geometry
│   ├── history.js          # great-orbit grouping
│   ├── photo.js            # capture envelope builder
│   └── posture-sensors.js  # camera + gyro acquisition
└── tests/
    ├── contracts.test.js
    ├── overlay.test.js
    ├── history.test.js
    ├── photo.test.js
    ├── posture-sensors.test.js
    └── medulla-ipc.test.js
```

## Environment variables

None. Configuration is in `app.json`.

## Testing

```bash
npm test
```

## Help

- Tests: `npm test`
- Metro bundler: `npx expo start`
- Android: `npx expo run:android`
- iOS: `npx expo run:ios`
- Inspect native logs: `adb logcat | grep -i radia` (Android)

## Security

- Private key is generated and held only inside the bare worklet; the host
  never holds or signs with it.
- QR payloads contain the public key only (+ nonce/account context).
- Nonces are single-use within a 5-minute TTL; always build fresh envelopes.
- ACL: `from === device` for first-party radia writes; external devices must
  present a coupled key and a valid signature.
- Replay/ACL/signature errors are fatal for that packet; do not auto-retry with
  the same nonce.
