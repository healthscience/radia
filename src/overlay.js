// radia/src/overlay.js — keypoint models + ratio-line geometry.
// Pure Node. The ratio lines are what a peer moves against the image; the
// contract (src/contracts.js) is the saved overlay-data reference.

export const BODY_KEYPOINTS = {
  headTop: { x: 0.50, y: 0.15, label: 'Head Top' },
  chin: { x: 0.50, y: 0.25, label: 'Chin/Neck' },
  hipCenter: { x: 0.50, y: 0.50, label: 'Torso Core' },
  leftWaist: { x: 0.42, y: 0.50, label: 'Waist L' },
  rightWaist: { x: 0.58, y: 0.50, label: 'Waist R' },
  feet: { x: 0.50, y: 0.88, label: 'Feet Base' },
  leftHand: { x: 0.30, y: 0.55, label: 'Hand L' },
  rightHand: { x: 0.70, y: 0.55, label: 'Hand R' }
}

export const FACE_KEYPOINTS = {
  forehead: { x: 0.50, y: 0.10, label: 'Forehead' },
  leftEye: { x: 0.43, y: 0.22, label: 'Eye L' },
  rightEye: { x: 0.57, y: 0.22, label: 'Eye R' },
  noseTip: { x: 0.50, y: 0.35, label: 'Nose' },
  mouthLeft: { x: 0.44, y: 0.50, label: 'Mouth L' },
  mouthRight: { x: 0.56, y: 0.50, label: 'Mouth R' },
  chin: { x: 0.50, y: 0.62, label: 'Chin' },
  leftCheek: { x: 0.38, y: 0.40, label: 'Cheek L' },
  rightCheek: { x: 0.62, y: 0.40, label: 'Cheek R' }
}

const d = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by)

// Ratio lines for the body overlay. Each line is a named segment between two
// keypoints; the peer moves these against the captured frame.
export function bodyRatioLines(nodes) {
  return [
    { name: 'orgo-axis', from: 'headTop', to: 'feet', length: d(nodes.headTop.x, nodes.headTop.y, nodes.feet.x, nodes.feet.y) },
    { name: 'gelle-torso', from: 'leftWaist', to: 'rightWaist', length: d(nodes.leftWaist.x, nodes.leftWaist.y, nodes.rightWaist.x, nodes.rightWaist.y) },
    { name: 'limb-span', from: 'leftHand', to: 'rightHand', length: d(nodes.leftHand.x, nodes.leftHand.y, nodes.rightHand.x, nodes.rightHand.y) }
  ]
}

// Ratio lines for the face close-up overlay.
export function faceRatioLines(nodes) {
  return [
    { name: 'face-height', from: 'forehead', to: 'chin', length: d(nodes.forehead.x, nodes.forehead.y, nodes.chin.x, nodes.chin.y) },
    { name: 'face-width', from: 'leftCheek', to: 'rightCheek', length: d(nodes.leftCheek.x, nodes.leftCheek.y, nodes.rightCheek.x, nodes.rightCheek.y) },
    { name: 'eye-span', from: 'leftEye', to: 'rightEye', length: d(nodes.leftEye.x, nodes.leftEye.y, nodes.rightEye.x, nodes.rightEye.y) },
    { name: 'mouth-span', from: 'mouthLeft', to: 'mouthRight', length: d(nodes.mouthLeft.x, nodes.mouthLeft.y, nodes.mouthRight.x, nodes.mouthRight.y) }
  ]
}

export function ratioLinesFor(contract) {
  return contract === 'exoCue-cameraOverlay-face-v1' ? faceRatioLines(FACE_KEYPOINTS) : bodyRatioLines(BODY_KEYPOINTS)
}

export function keypointModelFor(contract) {
  return contract === 'exoCue-cameraOverlay-face-v1' ? FACE_KEYPOINTS : BODY_KEYPOINTS
}

// Snapshot of a keypoint set as plain coordinates (for persistence/history).
export function serializeKeypoints(nodes) {
  const out = {}
  for (const k of Object.keys(nodes)) out[k] = { x: nodes[k].x, y: nodes[k].y, label: nodes[k].label }
  return out
}

export function deserializeKeypoints(serialized) {
  const out = {}
  for (const k of Object.keys(serialized)) out[k] = { x: serialized[k].x, y: serialized[k].y, label: serialized[k].label }
  return out
}