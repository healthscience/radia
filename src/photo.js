// radia/src/photo.js — capture envelope builder.
// Pure Node. A capture produces two records that share an id:
//   1. SAVE_PHOTO  -> worklet writes the frame bytes to Hyperdrive (radia image
//      store) and returns { id, path, driveKey, bytes }.
//   2. INGRESS_TELEMETRY -> worklet commits the overlay-data contract (radia
//      units) to the Hyperbee ledger, referencing the photo id so a peer can
//      move the ratio lines against the image.
//
// The host never holds the private key; the worklet signs the envelope on
// commit. Osmosis to BentoBoxDS is a medulla-side concern (stubbed hook here).

import { buildEnvelope, INGRESS_TELEMETRY, SAVE_PHOTO } from '@conduction/medulla'

// Build the IPC packet that saves a captured frame to the Hyperdrive image
// store. `buffer` is the raw frame bytes (e.g. a JPEG).
export function buildPhotoSavePacket(id, buffer, meta = {}) {
  return {
    id,
    action: SAVE_PHOTO,
    buffer,
    payload: { ...meta }
  }
}

// Build the IPC packet that commits the overlay-data contract to the ledger.
// `contract` is the exoCue-cameraOverlay-* object; `photoId` links it to the
// saved frame so a peer can move the ratio lines.
export function buildCaptureEnvelope({ id, contract, photoId, sensor, cipher = 'heli-phase-active' } = {}) {
  return buildEnvelope({
    id,
    from: 'radia',
    device: 'radia',
    action: INGRESS_TELEMETRY,
    payload: {
      contract: contract.contract,
      conduction: contract.conduction,
      scaleAnchor: contract.scaleAnchor,
      overlayData: contract.overlayData,
      photoId,
      sensor: sensor || contract.sensor || { pitch: 90, roll: 0 }
    },
    cipher
  })
}

// Convenience: build both packets for a capture in one call.
export function buildCapturePackets({ id, buffer, contract, sensor, cipher = 'heli-phase-active' } = {}) {
  return {
    save: buildPhotoSavePacket(id, buffer, { contract: contract.contract, sensor: sensor || contract.sensor }),
    ingress: buildCaptureEnvelope({ id, contract, photoId: id, sensor, cipher })
  }
}

// Osmosis hook: forward a committed capture to BentoBoxDS when the peer is on
// network and coupling is set up. NOT wired to a real peer SDK yet; the medulla
// worklet owns this path. The host calls this after a successful commit.
export function buildOsmosisPacket({ id, contract, photoId, accountId, driveKey } = {}) {
  return {
    id,
    action: 'OSMOSIS_SYNC',
    payload: {
      contract: contract.contract,
      overlayData: contract.overlayData,
      photoId,
      accountId,
      driveKey,
      ts: Date.now()
    }
  }
}