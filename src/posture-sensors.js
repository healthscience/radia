// radia/src/posture-sensors.js — camera + gyro posture acquisition.
// Host-only. Degrades gracefully when expo-camera / react-native-sensors are
// absent so unit tests run under plain Node.

import { useEffect, useState } from 'react'

let Camera = null
let Sensors = null
try { Camera = require('expo-camera') } catch (e) { Camera = null }
try { Sensors = require('react-native-sensors') } catch (e) { Sensors = null }

import { buildBodyOverlay, buildFaceOverlay, BODY_CONTRACT, FACE_CONTRACT } from './contracts'
import { BODY_KEYPOINTS, FACE_KEYPOINTS, serializeKeypoints } from './overlay'

// Default keypoint models. Keypoints are normalized 0..1 frame coordinates.
export const DEFAULT_BODY_NODES = BODY_KEYPOINTS
export const DEFAULT_FACE_NODES = FACE_KEYPOINTS

// Distance between two normalized keypoints.
const d = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by)

export function useCamera() {
  const [permission, setPermission] = useState(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let active = true
    if (!Camera) return
    ;(async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync()
        if (!active) return
        setPermission(status)
        if (status !== 'granted') return
        setIsReady(true)
      } catch (e) { if (active) setPermission('denied') }
    })()
    return () => { active = false; setIsReady(false) }
  }, [])

  return { permission, isReady }
}

export function useOrientation() {
  const [pitch, setPitch] = useState(90)
  const [roll, setRoll] = useState(0)
  useEffect(() => {
    const onOrient = (e) => {
      if (e.beta === null || e.gamma === null) return
      setPitch(e.beta); setRoll(e.gamma)
    }
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission().then((p) => { if (p === 'granted') window.addEventListener('deviceorientation', onOrient) })
    } else if (typeof window !== 'undefined') {
      window.addEventListener('deviceorientation', onOrient)
    }
    return () => { if (typeof window !== 'undefined') window.removeEventListener('deviceorientation', onOrient) }
  }, [])
  const aligned = Math.abs(pitch - 90) <= 7 && Math.abs(roll) <= 5
  return { pitch, roll, aligned }
}

// Produce a single posture vector snapshot from the current keypoint model.
// `mode` is 'body' (default) or 'face'.
export function samplePosture(nodes, orientation = {}, mode = 'body') {
  if (!nodes) return null
  return mode === 'face' ? buildFaceOverlay(nodes, orientation) : buildBodyOverlay(nodes, orientation)
}

export function usePostureSensors() {
  const [available, setAvailable] = useState(!!Sensors)
  const [sampling, setSampling] = useState(false)
  const [permission, setPermission] = useState(null)
  const [mode, setMode] = useState('body')
  const [bodyNodes, setBodyNodes] = useState({ ...DEFAULT_BODY_NODES })
  const [faceNodes, setFaceNodes] = useState({ ...DEFAULT_FACE_NODES })
  const { permission: camPermission, isReady } = useCamera()
  const { pitch, roll, aligned } = useOrientation()

  useEffect(() => {
    if (Camera) setPermission(camPermission)
    else setPermission('unavailable')
  }, [camPermission])

  const nodes = mode === 'face' ? faceNodes : bodyNodes
  const sample = () => samplePosture(nodes, { pitch, roll }, mode)
  const start = () => setSampling(true)
  const stop = () => setSampling(false)
  const setKeypoints = (mode, next) => (mode === 'face' ? setFaceNodes(next) : setBodyNodes(next))

  return {
    available, sampling, permission, mode, setMode,
    bodyNodes, faceNodes, setKeypoints,
    sample, start, stop, isReady, aligned, pitch, roll
  }
}

// Serialize the active keypoint model for persistence (history / osmosis).
export function serializeActive(nodes, mode) {
  return { mode, contract: mode === 'face' ? FACE_CONTRACT : BODY_CONTRACT, keypoints: serializeKeypoints(nodes) }
}