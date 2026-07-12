import { describe, expect, it } from 'vitest'
import { buildLineGradient, driveDayDotPositions, shouldCollapseToPill } from './route-geometry'

describe('shouldCollapseToPill', () => {
  it('does not collapse at or below the DESIGN.md inline-count ceiling (5)', () => {
    expect(shouldCollapseToPill(1)).toBe(false)
    expect(shouldCollapseToPill(3)).toBe(false)
    // Boundary: the committed drive-matrix's longest FoCo-anchored leg
    // (Denali, ~47.8h -> ceil/10 = 5) lands exactly here — proves the real
    // data never crosses into pill territory today.
    expect(shouldCollapseToPill(5)).toBe(false)
  })

  it('collapses above 5 (synthetic — no real destination reaches this from Fort Collins today)', () => {
    expect(shouldCollapseToPill(6)).toBe(true)
    expect(shouldCollapseToPill(12)).toBe(true)
  })
})

describe('driveDayDotPositions', () => {
  const origin = { lat: 0, lng: 0 }
  const destination = { lat: 10, lng: 20 }

  it('returns exactly N points for count N', () => {
    expect(driveDayDotPositions(origin, destination, 3)).toHaveLength(3)
  })

  it('places each point at its day-segment midpoint, never on an endpoint', () => {
    const positions = driveDayDotPositions(origin, destination, 2)
    expect(positions).toEqual([
      { lat: 2.5, lng: 5 },
      { lat: 7.5, lng: 15 },
    ])
    for (const pos of positions) {
      expect(pos).not.toEqual(origin)
      expect(pos).not.toEqual(destination)
    }
  })

  it('a single-day leg places its one dot at the true midpoint', () => {
    expect(driveDayDotPositions(origin, destination, 1)).toEqual([{ lat: 5, lng: 10 }])
  })
})

describe('buildLineGradient', () => {
  it('is fully transparent at progress 0', () => {
    const expr = buildLineGradient(0)
    expect(expr).toEqual([
      'interpolate',
      ['linear'],
      ['line-progress'],
      0,
      'rgba(193, 80, 46, 0)',
      1,
      'rgba(193, 80, 46, 0)',
    ])
  })

  it('is fully solid at progress 1', () => {
    const expr = buildLineGradient(1)
    expect(expr).toEqual(['interpolate', ['linear'], ['line-progress'], 0, '#c1502e', 1, '#c1502e'])
  })

  it('produces strictly increasing stop inputs at a mid-animation progress', () => {
    const expr = buildLineGradient(0.5) as unknown[]
    const stopInputs = [expr[3], expr[5], expr[7], expr[9]] as number[]
    for (let i = 1; i < stopInputs.length; i++) {
      expect(stopInputs[i]).toBeGreaterThan(stopInputs[i - 1] as number)
    }
  })

  it('clamps out-of-range progress instead of producing invalid stops', () => {
    expect(buildLineGradient(-0.5)).toEqual(buildLineGradient(0))
    expect(buildLineGradient(1.5)).toEqual(buildLineGradient(1))
  })
})
