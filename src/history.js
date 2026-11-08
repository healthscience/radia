// radia/src/history.js — capture history grouped by great orbit.
// Pure Node. In the old world a great orbit is one year of life as earth goes
// around the sun once; captures are grouped by calendar year.

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000

// Calendar year for a timestamp (UTC).
function yearOf(ts) {
  return new Date(ts).getUTCFullYear()
}

// Days since a timestamp (whole days).
function daysSince(ts) {
  return Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000))
}

// Group records by great orbit (calendar year), newest year first.
// Each orbit is labeled "Great Orbit YYYY" and carries the count and age.
export function groupedByOrbit(records) {
  const groups = {}
  for (const r of records) {
    const ts = r.ts || r.recordedAt || 0
    const year = yearOf(ts)
    if (!groups[year]) groups[year] = { year, captures: [] }
    groups[year].captures.push(r)
  }
  const orbits = Object.values(groups)
    .sort((a, b) => b.year - a.year)
    .map((g) => ({
      year: g.year,
      label: `Great Orbit ${g.year}`,
      captures: g.captures.sort((a, b) => (b.ts || b.recordedAt || 0) - (a.ts || a.recordedAt || 0)),
      count: g.captures.length,
      ageYears: (Date.now() - new Date(Date.UTC(g.year, 0, 1)).getTime()) / MS_PER_YEAR
    }))
  return orbits
}

// Human-readable age of a capture: "N great orbits ago" (years).
export function orbitAgeYears(ts) {
  return (Date.now() - ts) / MS_PER_YEAR
}

export function orbitAgeLabel(ts) {
  const years = orbitAgeYears(ts)
  if (years < 1) return 'this great orbit'
  const n = Math.floor(years)
  return `${n} great orbit${n === 1 ? '' : 's'} ago`
}

export function daysSinceCapture(ts) {
  return daysSince(ts)
}

// Flatten the grouped orbits back into a chronological list.
export function flattenOrbits(orbits) {
  const out = []
  for (const o of orbits) for (const c of o.captures) out.push(c)
  return out
}