import { describe, it, expect } from 'vitest'
import { buildBodyOverlay, buildFaceOverlay, BODY_CONTRACT, FACE_CONTRACT } from '../src/contracts'
import { BODY_KEYPOINTS, FACE_KEYPOINTS } from '../src/overlay'

describe('radia contracts', () => {
  it('body contract shape', () => {
    const p = buildBodyOverlay(BODY_KEYPOINTS, { pitch: 90, roll: 0 })
    expect(p.contract).toBe(BODY_CONTRACT)
    expect(p.conduction.version).toBe('1.0.0')
    expect(p.scaleAnchor.unit).toBe('radia')
    expect(p.scaleAnchor.modulusType).toBe('intrinsicField')
    expect(typeof p.overlayData.morphology.slendernessIndex).toBe('number')
    expect(typeof p.overlayData.orreryStrainCoefficients.gravitationalTorqueMultiplier).toBe('number')
    expect(p.sensor.pitch).toBe(90)
  })

  it('face contract shape (new contract, not a reuse)', () => {
    const p = buildFaceOverlay(FACE_KEYPOINTS, { pitch: 90, roll: 0 })
    expect(p.contract).toBe(FACE_CONTRACT)
    expect(p.contract).not.toBe(BODY_CONTRACT)
    expect(p.overlayData.morphology.facialIndex).toBeDefined()
    expect(p.overlayData.morphology.ocularIndex).toBeDefined()
    expect(p.overlayData.morphology.nasalIndex).toBeDefined()
    expect(p.overlayData.morphology.mouthIndex).toBeDefined()
  })

  it('strain coefficients derive from the primary ratio', () => {
    const p = buildBodyOverlay(BODY_KEYPOINTS, { pitch: 90, roll: 0 })
    const s = p.overlayData.morphology.slendernessIndex
    expect(p.overlayData.orreryStrainCoefficients.gravitationalTorqueMultiplier)
      .toBeCloseTo(Number(Math.pow(s, 2).toFixed(2)))
  })

  it('is deterministic for identical inputs', () => {
    expect(buildBodyOverlay(BODY_KEYPOINTS, { pitch: 92, roll: 2 }))
      .toEqual(buildBodyOverlay(BODY_KEYPOINTS, { pitch: 92, roll: 2 }))
  })

  it('is sensitive to keypoint changes', () => {
    const moved = { ...BODY_KEYPOINTS, feet: { ...BODY_KEYPOINTS.feet, y: 0.95 } }
    const a = buildBodyOverlay(BODY_KEYPOINTS)
    const b = buildBodyOverlay(moved)
    expect(b.overlayData.morphology.slendernessIndex).not.toBe(a.overlayData.morphology.slendernessIndex)
  })
})
