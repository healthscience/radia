// radia/host/medulla-rpc.js — medulla Worklet RPC hook (host-only, no RN).
// Wraps worklet.IPC with id correlation, pending map, timeout and MEDULLA_ERROR
// rejection. Private key never leaves the worklet.

import { useEffect, useRef, useState } from 'react'
import { Worklet } from 'react-native-bare-kit'
import { documentDirectory } from 'expo-file-system'
import bundle from './medulla.bundle'
import {
  MEDULLA_READY, MEDULLA_ERROR, INGRESS_COMMITTED,
  INGRESS_TELEMETRY, EGRESS_TELEMETRY, COUPLE, COUPLED, VERIFY, VERIFIED,
  SAVE_PHOTO, PHOTO_SAVED, GET_PHOTO, PHOTO_RETRIEVED, LIST_PHOTOS, PHOTO_LIST,
  buildEnvelope
} from '@conduction/medulla'

const RPC_TIMEOUT_MS = 15000

export function useMedulla({ appId = 'radia', onIngress, onCoupled, onVerified } = {}) {
  const [worklet, setWorklet] = useState(null)
  const [publicKey, setPublicKey] = useState(null)
  const [status, setStatus] = useState('Initializing Medulla...')
  const [lastCommit, setLastCommit] = useState('Awaiting sensory ingress...')
  const pending = useRef(new Map())

  const send = (action, payload = {}, extras = {}) => {
    if (!worklet) return Promise.reject(new Error('Medulla not ready'))
    const id = `rpc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const packet = { id, action, payload, ...extras }
    return new Promise((resolve, reject) => {
      pending.current.set(id, { resolve, reject })
      worklet.IPC.write(JSON.stringify(packet))
      setTimeout(() => {
        if (pending.current.has(id)) {
          pending.current.delete(id)
          reject(new Error(`RPC timeout: ${action}`))
        }
      }, RPC_TIMEOUT_MS)
    })
  }

  useEffect(() => {
    let instance
    try {
      instance = new Worklet()
      instance.start('/medulla.bundle', bundle, [String(documentDirectory)])
      instance.IPC.on('data', (raw) => {
        let msg
        try { msg = JSON.parse(raw) } catch (_) { return }
        if (msg.id && pending.current.has(msg.id)) {
          const { resolve, reject } = pending.current.get(msg.id)
          pending.current.delete(msg.id)
          if (msg.type === MEDULLA_ERROR) reject(new Error(msg.error))
          else resolve(msg)
        }
        if (msg.type === MEDULLA_READY) {
          setPublicKey(msg.publicKey || null)
          setStatus(`Medulla Active — ${msg.publicKey?.slice(0, 8)}…`)
        } else if (msg.type === INGRESS_COMMITTED) {
          setLastCommit(`Committed [${String(msg.device || '').toUpperCase()}]: ${msg.key}`)
          onIngress?.(msg)
        } else if (msg.type === COUPLED) onCoupled?.(msg)
        else if (msg.type === VERIFIED) onVerified?.(msg)
        else if (msg.type === MEDULLA_ERROR) setStatus(`Medulla Error: ${msg.error}`)
      })
      setWorklet(instance)
    } catch (err) { setStatus(`Initialization Error: ${err.message}`) }
    return () => { try { instance?.stop?.() } catch (_) {} }
  }, [onIngress, onCoupled, onVerified])

  const sendIngress = (device, payload, cipher = 'heli-phase-active') => {
    if (!worklet) return Promise.resolve(null)
    const env = buildEnvelope({ from: appId, device, action: INGRESS_TELEMETRY, payload, cipher })
    return send(INGRESS_TELEMETRY, null, env)
  }
  const couple = (accountId, meta = {}) => send(COUPLE, { accountId, publicKey, meta })
  const verify = (challenge) => send(VERIFY, { challenge })
  const egress = (device, limit = 100) => send(EGRESS_TELEMETRY, { device, payload: { limit } })
  // Save a captured frame to the Hyperdrive image store (radia image store).
  const savePhoto = (id, buffer, meta = {}) => send(SAVE_PHOTO, { id, buffer, ...meta })
  // Read a saved frame back (base64) for history thumbnails / face close-up.
  const getPhoto = (id) => send(GET_PHOTO, { id })
  // List saved frames.
  const listPhotos = (limit = 100) => send(LIST_PHOTOS, { limit })

  return { worklet, publicKey, status, lastCommit, sendIngress, couple, verify, egress, send, savePhoto, getPhoto, listPhotos }
}