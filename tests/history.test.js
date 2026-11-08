import { describe, it, expect } from 'vitest'
import { groupedByOrbit, flattenOrbits, orbitAgeLabel } from '../src/history'

const YEAR = new Date(Date.UTC(2024, 0, 1)).getTime()
const rec = (year, month, payload) => ({ ts: new Date(Date.UTC(year, month, 1)).getTime(), payload })

describe('radia history great-orbit grouping', () => {
  it('groups captures by calendar year (great orbit)', () => {
    const orbits = groupedByOrbit([
      rec(2024, 0, { contract: 'exoCue-cameraOverlay-v1' }),
      rec(2024, 5, { contract: 'exoCue-cameraOverlay-v1' }),
      rec(2023, 0, { contract: 'exoCue-cameraOverlay-face-v1' })
    ])
    expect(orbits).toHaveLength(2)
    expect(orbits[0].year).toBe(2024)
    expect(orbits[0].label).toBe('Great Orbit 2024')
    expect(orbits[0].count).toBe(2)
    expect(orbits[1].year).toBe(2023)
    expect(orbits[1].count).toBe(1)
  })

  it('sorts captures newest-first within an orbit', () => {
    const orbits = groupedByOrbit([
      rec(2024, 0, { a: 1 }),
      rec(2024, 5, { a: 2 })
    ])
    expect(orbits[0].captures[0].payload.a).toBe(2)
    expect(orbits[0].captures[1].payload.a).toBe(1)
  })

  it('sorts orbits newest year first', () => {
    const orbits = groupedByOrbit([rec(2023, 0, {}), rec(2025, 0, {}), rec(2024, 0, {})])
    expect(orbits.map((o) => o.year)).toEqual([2025, 2024, 2023])
  })

  it('empty history yields no orbits', () => {
    expect(groupedByOrbit([])).toHaveLength(0)
  })

  it('flattenOrbits recovers every capture', () => {
    const orbits = groupedByOrbit([rec(2024, 0, {}), rec(2023, 0, {})])
    expect(flattenOrbits(orbits)).toHaveLength(2)
  })

  it('labels age in great orbits', () => {
    const recent = Date.now() - 1 * 24 * 60 * 60 * 1000
    expect(orbitAgeLabel(recent)).toBe('this great orbit')
  })
})
