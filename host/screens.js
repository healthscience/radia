// radia/host/screens.js — screen components (host-only, RN).
// Boot -> Setup/Couple -> Capture -> History -> Face close-up.

import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'

export function BootScreen({ status, publicKey }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>RADIA — POSTURE</Text>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.hint}>Pubkey: {publicKey ? `${publicKey.slice(0, 16)}…` : '—'}</Text>
    </View>
  )
}

export function SetupScreen({ publicKey, accountId, setAccountId, onCouple }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>SETUP — COUPLE</Text>
      <Text style={styles.hint}>Scan the QR in BentoBoxDS HOP to register this instrument.</Text>
      <View style={styles.qrCard}>
        <Text style={styles.qrText} selectable>
{JSON.stringify({
  v: 1,
  type: 'conduction-couple',
  instrument: 'radia',
  publicKey,
  nonce: 'radia-setup-nonce',
  accountId
}, null, 0)}
        </Text>
      </View>
      <Text style={styles.label}>Account id</Text>
      <Text style={styles.value} selectable>{accountId}</Text>
      <TouchableOpacity onPress={onCouple} style={styles.button}>
        <Text style={styles.buttonText}>Couple Account</Text>
      </TouchableOpacity>
    </View>
  )
}

export function CaptureScreen({ status, available, sampling, permission, aligned, pitch, roll, onTake, readings }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CAPTURE</Text>
      <Text style={styles.status}>{status}</Text>
      <Text style={styles.hint}>Sensors: {available ? 'available' : 'unavailable'} | Tilt: {aligned ? 'LEVEL OK' : `pitch ${Math.round(pitch)} roll ${Math.round(roll)}`}</Text>
      <Text style={styles.hint}>Permission: {permission || 'pending'}</Text>
      <ScrollView style={styles.list}>
        {readings.map((r, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.device}>{r.device || 'radia'}</Text>
            <Text style={styles.payload}>{r.key || JSON.stringify(r.payload?.overlayData?.morphology)}</Text>
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity onPress={onTake} style={[styles.button, !available && styles.disabled]}>
        <Text style={styles.buttonText}>{sampling ? 'Sampling…' : 'Take Photo'}</Text>
      </TouchableOpacity>
    </View>
  )
}

export function HistoryScreen({ orbits, onFace }) {
  if (orbits.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>HISTORY</Text>
        <Text style={styles.hint}>No captures yet. Take a photo to begin.</Text>
      </View>
    )
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>HISTORY</Text>
      <ScrollView>
        {orbits.map((o) => (
          <View key={o.year} style={styles.orbitCard}>
            <Text style={styles.orbitLabel}>{o.label} — {o.captures.length} capture{o.captures.length === 1 ? '' : 's'}</Text>
            {o.captures.map((c, i) => (
              <View key={i} style={styles.captureRow}>
                <Text style={styles.captureMeta}>
                  {new Date(c.ts || c.recordedAt || 0).toISOString().slice(0, 19).replace('T', ' ')} · {o.ageYears < 1 ? 'this great orbit' : `${Math.floor(o.ageYears)} great orbits ago`}
                </Text>
                <Text style={styles.captureContract}>{c.payload?.contract || c.contract || '—'}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity onPress={onFace} style={styles.button}>
        <Text style={styles.buttonText}>Face Close-Up</Text>
      </TouchableOpacity>
    </View>
  )
}

export function FaceScreen({ onBack }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FACE — CLOSE-UP</Text>
      <Text style={styles.hint}>Face keypoints + face ratios overlay (exoCue-cameraOverlay-face-v1).</Text>
      <TouchableOpacity onPress={onBack} style={[styles.button, styles.secondary]}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303', padding: 24 },
  title: { color: '#00FFCC', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 4 },
  status: { color: '#777', fontSize: 12, fontFamily: 'monospace', marginBottom: 4 },
  hint: { color: '#555', fontSize: 11, fontFamily: 'monospace', marginBottom: 4 },
  label: { color: '#888', fontSize: 11, marginBottom: 4, fontFamily: 'monospace' },
  value: { color: '#FFF', fontSize: 12, fontFamily: 'monospace', marginBottom: 8 },
  qrCard: { backgroundColor: '#111', padding: 16, borderRadius: 6, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  qrText: { color: '#AAA', fontFamily: 'monospace', fontSize: 10 },
  list: { maxHeight: 160, marginBottom: 12 },
  row: { backgroundColor: '#111', padding: 10, borderRadius: 6, marginBottom: 6 },
  device: { color: '#00FFCC', fontFamily: 'monospace', fontSize: 11 },
  payload: { color: '#AAA', fontFamily: 'monospace', fontSize: 11 },
  orbitCard: { backgroundColor: '#111', padding: 16, borderRadius: 6, marginBottom: 12, borderWidth: 1, borderColor: '#222' },
  orbitLabel: { color: '#00FFCC', fontFamily: 'monospace', fontSize: 13, marginBottom: 8 },
  captureRow: { paddingVertical: 4 },
  captureMeta: { color: '#AAA', fontFamily: 'monospace', fontSize: 11 },
  captureContract: { color: '#777', fontFamily: 'monospace', fontSize: 10 },
  button: { backgroundColor: '#1E293B', padding: 16, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#334155', marginBottom: 8 },
  secondary: { backgroundColor: '#064E3B', borderColor: '#065F46' },
  disabled: { opacity: 0.5 },
  buttonText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 }
})
