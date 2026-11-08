import { describe, it, expect } from 'vitest'
import { bodyRatioLines, faceRatioLines, ratioLinesFor, keypointModelFor, serializeKeypoints, deserializeKeypoints, BODY_KEYPOINTS, FACE_KEYPOINTS } from '../src/overlay'

describe('radia overlay ratio lines', () => {
  it('body ratio lines are named segments', () => {
    const lines = bodyRatioLines(BODY_KEYPOINTS)
    expect(lines).toHaveLength(3)
    expect(lines.map((l) => l.name)).toEqual(['orgo-axis', 'gelle-torso', 'limb-span'])
    for (const l of lines) expect(typeof l.length).toBe('number')
  })

  it('face ratio lines are named segments', () => {
    const lines = faceRatioLines(FACE_KEYPOINTS)
    expect(lines).toHaveLength(4)
    expect(lines.map((l) => l.name)).toEqual(['face-height', 'face-width', 'eye-span', 'mouth-span'])
  })

  it('ratioLinesFor picks by contract', () => {
    expect(ratioLinesFor('exoCue-cameraOverlay-face-v1')).toHaveLength(4)
    expect(ratioLinesFor('exoCue-cameraOverlay-v1')).toHaveLength(3)
  })

  it('keypointModelFor picks by contract', () => {
    expect(keypointModelFor('exoCue-cameraOverlay-face-v1')).toBe(FACE_KEYPOINTS)
    expect(keypointModelFor('exoCue-cameraOverlay-v1')).toBe(BODY_KEYPOINTS)
  })

  it('serialize/deserialize round-trips keypoints', () => {
    const s = serializeKeypoints(BODY_KEYPOINTS)
    const back = deserializeKeypoints(s)
    expect(back.headTop.x).toBe(BODY_KEYPOINTS.headTop.x)
    expect(back.headTop.label).toBe(BODY_KEYPOINTS.headTop.label)
  })
})
