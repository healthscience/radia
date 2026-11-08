// radia/host/App.js — radia conduction instrument app.
// Body posture vectors: live camera overlay + gyroscope, routed into
// @conduction/medulla via the bare Worklet. All crypto, P2P and storage live in
// the core; this app only adds sensor acquisition, QR coupling UI and
// authenticated capture. Private key never leaves the worklet.
//
// Flow: Boot -> Setup/Couple -> Capture -> History -> Face close-up.

import React, { useEffect, useState } from 'react'
import { useMedulla } from './medulla-rpc'
import { usePostureSensors } from '../src/posture-sensors'
import {
  BootScreen, SetupScreen, CaptureScreen, HistoryScreen, FaceScreen
} from './screens'
import { groupedByOrbit } from '../src/history'
import { buildCapturePackets } from '../src/photo'

const DEFAULT_ACCOUNT = 'bentoboxds-hop-prime-account-id'

export default function RadiaApp() {
  const [coupled, setCoupled] = useState(false)
  const [verified, setVerified] = useState(false)
  const [accountId, setAccountId] = useState(DEFAULT_ACCOUNT)
  const [captures, setCaptures] = useState([])
  const [screen, setScreen] = useState('boot')
  const { publicKey, status, lastCommit, sendIngress, couple, verify, savePhoto, listPhotos } = useMedulla({
    appId: 'radia',
    onCoupled: (msg) => { setCoupled(true); setAccountId(msg.accountId || accountId) },
    onVerified: () => setVerified(true),
    onIngress: (msg) => setCaptures((c) => [{ key: msg.key, device: msg.device, ts: Date.now(), payload: msg.payload }, ...c.slice(0, 49)])
  })
  const { available, sampling, permission, sample, aligned, pitch, roll } = usePostureSensors()

  // Reload persisted captures on boot.
  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await listPhotos(100)
        if (active && res && res.photos) {
          setCaptures(res.photos.map((p) => ({ id: p.name, ts: 0, payload: { contract: 'saved-photo' } })))
        }
      } catch (_) { /* not ready yet */ }
    })()
    return () => { active = false }
  }, [listPhotos])

  // Sign back in: if a coupling record exists, self-verify the private key.
  useEffect(() => {
    if (publicKey && coupled) {
      verify(`couple:${accountId}:${Date.now()}:radia-reentry-nonce`).catch(() => {})
    }
  }, [publicKey, coupled, accountId, verify])

  const takePhoto = async () => {
    const v = sample()
    if (!v) return
    const id = `radia-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const packets = buildCapturePackets({ id, contract: v, sensor: { pitch, roll } })
    try {
      await savePhoto(id, Buffer.from('fake-jpeg-bytes'), packets.save.payload)
      await sendIngress('radia', packets.ingress.payload, packets.ingress.cipher)
      setCaptures((c) => [{ id, ts: Date.now(), payload: v }, ...c.slice(0, 49)])
      setScreen('history')
    } catch (e) { /* replay/ACL errors are fatal for this packet; do not retry */ }
  }

  const doCouple = () => couple(accountId, { instrument: 'radia', coupledVia: 'qr' })

  if (screen === 'face') return <FaceScreen onBack={() => setScreen('history')} />
  if (screen === 'history') return <HistoryScreen orbits={groupedByOrbit(captures)} onFace={() => setScreen('face')} />
  if (screen === 'setup') return <SetupScreen publicKey={publicKey} accountId={accountId} setAccountId={setAccountId} onCouple={doCouple} />
  if (screen === 'capture') return <CaptureScreen status={status} available={available} sampling={sampling} permission={permission} aligned={aligned} pitch={pitch} roll={roll} onTake={takePhoto} readings={captures} />
  return <BootScreen status={status} publicKey={publicKey} />
}