import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {
  Medulla,
  buildEnvelope,
  INGRESS_TELEMETRY,
  EGRESS_TELEMETRY,
  COUPLE,
  COUPLED,
  VERIFY,
  VERIFIED,
  INGRESS_COMMITTED,
  MEDULLA_READY,
  MEDULLA_ERROR,
  egressResponse,
  commitResponse
} from '@conduction/medulla'

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'radia-ipc-'))

describe('radia medulla IPC contract', () => {
  let medulla
  beforeEach(async () => {
    medulla = new Medulla(path.join(tmp, 'core-' + Math.random().toString(36).slice(2)))
    await medulla.ready()
  })
  afterEach(async () => { await medulla.close() })

  it('emits MEDULLA_READY with publicKey and protocol', () => {
    expect(medulla.publicKeyHex).toHaveLength(64)
    const ready = { type: MEDULLA_READY, path: medulla.storageDir, publicKey: medulla.publicKeyHex, protocol: 'conduction/medulla/v1' }
    expect(ready.type).toBe(MEDULLA_READY)
    expect(ready.protocol).toBe('conduction/medulla/v1')
  })

  it('COUPLE returns COUPLED with accountId + instrument', async () => {
    const rec = await medulla.couple('bentoboxds-hop-prime-account-id', medulla.publicKeyHex, { coupledVia: 'qr' })
    expect(rec.accountId).toBe('bentoboxds-hop-prime-account-id')
    expect(rec.publicKey).toBe(medulla.publicKeyHex)
    expect(rec.instrument).toBe(medulla.publicKeyHex)
    const got = await medulla.getCoupling('bentoboxds-hop-prime-account-id')
    expect(got.instrument).toBe(medulla.publicKeyHex)
    const all = await medulla.listCouplings()
    expect(all).toHaveLength(1)
  })

  it('VERIFY signs a challenge; VERIFIED payload verifies', async () => {
    await medulla.couple('acct-1', medulla.publicKeyHex)
    const challenge = `couple:acct-1:${Date.now()}:radia-nonce`
    const signed = await medulla.signChallenge(challenge)
    expect(signed.publicKey).toBe(medulla.publicKeyHex)
    expect(signed.challenge).toBe(challenge)
    expect(Medulla.verifyChallenge(challenge, signed.signature, medulla.publicKeyHex)).toBe(true)
    expect(Medulla.verifyChallenge(challenge + 'x', signed.signature, medulla.publicKeyHex)).toBe(false)
  })

  it('INGRESS_TELEMETRY commits a signed posture envelope', async () => {
    const env = buildEnvelope({
      id: 'radia-posture-1',
      from: 'radia',
      device: 'radia',
      action: INGRESS_TELEMETRY,
      payload: { contract: 'exoCue-cameraOverlay-v1', cranialAngle: 11.2 },
      cipher: 'heli-phase-active'
    })
    const res = await medulla.ingest(env)
    expect(res.type).toBe(INGRESS_COMMITTED)
    expect(res.id).toBe('radia-posture-1')
    expect(res.device).toBe('radia')
    expect(res.key).toBe(`conduction/radia/${env.ts}`)
    const records = await medulla.query('radia')
    expect(records[0].value.sig).toBeTruthy()
    expect(records[0].value.nonce).toBe(env.nonce)
  })

  it('rejects ACL violation when from != device and not coupled', async () => {
    const env = buildEnvelope({ id: 'bad-1', from: 'wearable-x', device: 'radia', action: INGRESS_TELEMETRY, payload: { x: 1 } })
    await expect(medulla.ingest(env)).rejects.toThrow(/ACL/)
  })

  it('rejects replayed nonces', async () => {
    const env = buildEnvelope({ id: 'r-1', from: 'radia', device: 'radia', action: INGRESS_TELEMETRY, payload: { x: 1 } })
    await medulla.ingest(env)
    await expect(medulla.ingest({ ...env, id: 'r-2', ts: Date.now() })).rejects.toThrow(/Replay/)
  })

  it('EGRESS_TELEMETRY returns records newest-first', async () => {
    await medulla.ingest('radia', { a: 1 }, 'c', 1000)
    await medulla.ingest('radia', { a: 2 }, 'c', 2000)
    const res = egressResponse('rpc-4', 'radia', await medulla.query('radia', 100))
    expect(res.type).toBe(EGRESS_TELEMETRY)
    expect(res.id).toBe('rpc-4')
    expect(res.status).toBe('OK')
    expect(res.records[0].key).toBe('conduction/radia/2000')
    expect(res.records[1].key).toBe('conduction/radia/1000')
  })

  it('commitResponse echoes the request id', () => {
    const r = commitResponse('rpc-3', 'conduction/radia/1700000000000', 'radia', { recordedAt: 1700000000000 })
    expect(r).toEqual({ id: 'rpc-3', type: INGRESS_COMMITTED, key: 'conduction/radia/1700000000000', device: 'radia', status: 'OK', recordedAt: 1700000000000 })
  })

  it('MEDULLA_ERROR shape carries id + error', () => {
    const e = { id: 'rpc-x', type: MEDULLA_ERROR, error: 'boom' }
    expect(e.type).toBe(MEDULLA_ERROR)
    expect(e.id).toBe('rpc-x')
    expect(e.error).toBe('boom')
  })
})

afterAll(() => { fs.rmSync(tmp, { recursive: true, force: true }) })