import { describe, it, expect } from 'vitest'
import { buildBodyOverlay } from '../src/contracts'
import { BODY_KEYPOINTS } from '../src/overlay'
import { buildCapturePackets, buildPhotoSavePacket, buildCaptureEnvelope, buildOsmosisPacket } from '../src/photo'
import { INGRESS_TELEMETRY, SAVE_PHOTO } from '@conduction/medulla'

describe('radia capture packets', () => {
  const contract = buildBodyOverlay(BODY_KEYPOINTS, { pitch: 90, roll: 0 })

  it('buildPhotoSavePacket targets the worklet photo store', () => {
    const p = buildPhotoSavePacket('photo-1', Buffer.from('img'), { contract: contract.contract })
    expect(p.action).toBe(SAVE_PHOTO)
    expect(p.id).toBe('photo-1')
    expect(Buffer.isBuffer(p.buffer)).toBe(true)
    expect(p.payload.contract).toBe('exoCue-cameraOverlay-v1')
  })

  it('buildCaptureEnvelope is an ingress envelope with the overlay-data contract', () => {
    const e = buildCaptureEnvelope({ id: 'cap-1', contract, photoId: 'photo-1' })
    expect(e.action).toBe(INGRESS_TELEMETRY)
    expect(e.from).toBe('radia')
    expect(e.device).toBe('radia')
    expect(e.nonce).toBeTruthy()
    expect(e.ts).toBeTruthy()
    expect(e.payload.contract).toBe('exoCue-cameraOverlay-v1')
    expect(e.payload.photoId).toBe('photo-1')
    expect(e.payload.overlayData.morphology.slendernessIndex).toBe(contract.overlayData.morphology.slendernessIndex)
  })

  it('buildCapturePackets produces both packets sharing an id', () => {
    const { save, ingress } = buildCapturePackets({ id: 'cap-2', contract })
    expect(save.id).toBe('cap-2')
    expect(ingress.id).toBe('cap-2')
    expect(save.action).toBe(SAVE_PHOTO)
    expect(ingress.action).toBe(INGRESS_TELEMETRY)
    expect(ingress.payload.photoId).toBe('cap-2')
  })

  it('buildOsmosisPacket is the osmosis sync hook (stubbed peer path)', () => {
    const o = buildOsmosisPacket({ id: 'osm-1', contract, photoId: 'cap-2', accountId: 'acct-1', driveKey: 'deadbeef' })
    expect(o.action).toBe('OSMOSIS_SYNC')
    expect(o.payload.accountId).toBe('acct-1')
    expect(o.payload.photoId).toBe('cap-2')
    expect(o.payload.ts).toBeTruthy()
  })
})
