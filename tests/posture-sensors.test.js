import { describe, it, expect } from 'vitest'
import { buildBodyOverlay, BODY_CONTRACT } from '../src/contracts'
import { BODY_KEYPOINTS } from '../src/overlay'
import { samplePosture, DEFAULT_BODY_NODES } from '../src/posture-sensors'

describe('radia posture sensor contract', () => {
  it('keeps the default body keypoint model', () => {
    expect(DEFAULT_BODY_NODES).toBe(BODY_KEYPOINTS)
    expect(Object.keys(DEFAULT_BODY_NODES).sort()).toEqual(
      ['chin', 'feet', 'headTop', 'hipCenter', 'leftHand', 'leftWaist', 'rightHand', 'rightWaist'].sort()
    )
  })

  it('builds the exoCue-cameraOverlay-v1 body contract', () => {
    const p = buildBodyOverlay(BODY_KEYPOINTS, { pitch: 90, roll: 0 })
    expect(p.contract).toBe(BODY_CONTRACT)
    expect(p.conduction.version).toBe('1.0.0')
    expect(p.scaleAnchor.unit).toBe('radia')
    expect(typeof p.overlayData.morphology.slendernessIndex).toBe('number')
    expect(typeof p.overlayData.morphology.appendicularRatio).toBe('number')
    expect(typeof p.overlayData.morphology.gelleAspectProfile).toBe('number')
    expect(typeof p.overlayData.orreryStrainCoefficients.gravitationalTorqueMultiplier).toBe('number')
    expect(typeof p.overlayData.orreryStrainCoefficients.hydrostaticWorkFactor).toBe('number')
    expect(p.sensor.pitch).toBe(90)
    expect(p.sensor.roll).toBe(0)
  })

  it('samplePosture wraps buildBodyOverlay in body mode', () => {
    const p = samplePosture(BODY_KEYPOINTS, { pitch: 90, roll: 0 }, 'body')
    expect(p.contract).toBe(BODY_CONTRACT)
  })

  it('computes strain coefficients from slenderness index', () => {
    const p = buildBodyOverlay(BODY_KEYPOINTS, { pitch: 90, roll: 0 })
    const s = p.overlayData.morphology.slendernessIndex
    expect(p.overlayData.orreryStrainCoefficients.gravitationalTorqueMultiplier)
      .toBeCloseTo(Number(Math.pow(s, 2).toFixed(2)))
  })

  it('is deterministic for identical inputs', () => {
    const a = buildBodyOverlay(BODY_KEYPOINTS, { pitch: 92, roll: 2 })
    const b = buildBodyOverlay(BODY_KEYPOINTS, { pitch: 92, roll: 2 })
    expect(a).toEqual(b)
  })

  it('is sensitive to node changes', () => {
    const moved = { ...BODY_KEYPOINTS, feet: { ...BODY_KEYPOINTS.feet, y: 0.95 } }
    const a = buildBodyOverlay(BODY_KEYPOINTS, { pitch: 90, roll: 0 })
    const b = buildBodyOverlay(moved, { pitch: 90, roll: 0 })
    expect(b.overlayData.morphology.slendernessIndex).not.toBe(a.overlayData.morphology.slendernessIndex)
  })
})