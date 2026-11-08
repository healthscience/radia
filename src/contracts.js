// radia/src/contracts.js — overlay-data contract builders (body + face).
// Pure Node. Produces the exoCue-cameraOverlay-* contract schema in radia units.
// Kept in memory on radia; the worklet persists it to the ledger.

export const BODY_CONTRACT = 'exoCue-cameraOverlay-v1'
export const FACE_CONTRACT = 'exoCue-cameraOverlay-face-v1'

export const CONDUCTION = {
  version: '1.0.0',
  heliCycle: 'solar-day-pulse-primary',
  opticalMode: 'scaleInvariantGrid'
}

export const SCALE_ANCHOR = {
  unit: 'radia',
  modulusType: 'intrinsicField',
  value: 1.0
}

// Distance between two normalized keypoints.
const d = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by)

function morphology(slendernessIndex, appendicularRatio, gelleAspectProfile) {
  return {
    slendernessIndex,
    appendicularRatio,
    gelleAspectProfile
  }
}

function strainCoefficients(slendernessIndex, appendicularRatio) {
  return {
    gravitationalTorqueMultiplier: Number(Math.pow(slendernessIndex, 2).toFixed(2)),
    hydrostaticWorkFactor: Number((slendernessIndex * appendicularRatio).toFixed(2))
  }
}

// Body posture contract. Keypoints are normalized 0..1 frame coordinates.
export function buildBodyOverlay(nodes, orientation = {}) {
  const torsoLen = d(nodes.chin.x, nodes.chin.y, nodes.hipCenter.x, nodes.hipCenter.y)
  const torsoWidth = d(nodes.leftWaist.x, nodes.leftWaist.y, nodes.rightWaist.x, nodes.rightWaist.y)
  const legLen = d(nodes.hipCenter.x, nodes.hipCenter.y, nodes.feet.x, nodes.feet.y)
  const armSpan = d(nodes.leftHand.x, nodes.leftHand.y, nodes.rightHand.x, nodes.rightHand.y)
  const totalLen = d(nodes.headTop.x, nodes.headTop.y, nodes.feet.x, nodes.feet.y)
  const slendernessIndex = Number((totalLen / Math.max(torsoWidth, 0.001)).toFixed(2))
  const appendicularRatio = Number(((legLen + armSpan) / Math.max(torsoLen, 0.001)).toFixed(2))
  const gelleAspectProfile = Number((torsoWidth / Math.max(torsoLen, 0.001)).toFixed(2))
  return {
    contract: BODY_CONTRACT,
    conduction: CONDUCTION,
    scaleAnchor: SCALE_ANCHOR,
    overlayData: {
      morphology: morphology(slendernessIndex, appendicularRatio, gelleAspectProfile),
      segments: {
        torso: { orgo: { lengthRadia: 1.0 }, gelle: { widthRadia: gelleAspectProfile } },
        legs: { orgo: { lengthRadia: Number((legLen / torsoLen).toFixed(2)) } },
        arms: { orgo: { lengthRadia: Number((armSpan / (2 * torsoLen)).toFixed(2)) } }
      },
      orreryStrainCoefficients: strainCoefficients(slendernessIndex, appendicularRatio)
    },
    sensor: { pitch: orientation.pitch ?? 90, roll: orientation.roll ?? 0 }
  }
}

// Face close-up contract. Keypoints are normalized 0..1 frame coordinates.
export function buildFaceOverlay(nodes, orientation = {}) {
  const faceHeight = d(nodes.forehead.x, nodes.forehead.y, nodes.chin.x, nodes.chin.y)
  const faceWidth = d(nodes.leftCheek.x, nodes.leftCheek.y, nodes.rightCheek.x, nodes.rightCheek.y)
  const eyeSpan = d(nodes.leftEye.x, nodes.leftEye.y, nodes.rightEye.x, nodes.rightEye.y)
  const noseLen = d(nodes.forehead.x, nodes.forehead.y, nodes.chin.x, nodes.chin.y)
  const mouthWidth = d(nodes.mouthLeft.x, nodes.mouthLeft.y, nodes.mouthRight.x, nodes.mouthRight.y)
  const facialIndex = Number((faceHeight / Math.max(faceWidth, 0.001)).toFixed(2))
  const ocularIndex = Number((eyeSpan / Math.max(faceHeight, 0.001)).toFixed(2))
  const nasalIndex = Number((noseLen / Math.max(faceHeight, 0.001)).toFixed(2))
  const mouthIndex = Number((mouthWidth / Math.max(faceHeight, 0.001)).toFixed(2))
  return {
    contract: FACE_CONTRACT,
    conduction: CONDUCTION,
    scaleAnchor: SCALE_ANCHOR,
    overlayData: {
      morphology: { facialIndex, ocularIndex, nasalIndex, mouthIndex },
      segments: {
        face: { orgo: { lengthRadia: 1.0 }, gelle: { widthRadia: facialIndex } },
        eyes: { orgo: { lengthRadia: ocularIndex } },
        nose: { orgo: { lengthRadia: nasalIndex } },
        mouth: { orgo: { lengthRadia: mouthIndex } }
      },
      orreryStrainCoefficients: {
        gravitationalTorqueMultiplier: Number(Math.pow(facialIndex, 2).toFixed(2)),
        hydrostaticWorkFactor: Number((facialIndex * ocularIndex).toFixed(2))
      }
    },
    sensor: { pitch: orientation.pitch ?? 90, roll: orientation.roll ?? 0 }
  }
}