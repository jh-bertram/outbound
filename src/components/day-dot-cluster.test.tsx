import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DayDotCluster, Dot } from './day-dot-cluster'

describe('DayDotCluster', () => {
  it('renders exactly N dots for count <= --dot-max-inline-count', () => {
    render(<DayDotCluster count={3} variant="drive" />)
    const dots = screen.getAllByTestId('dot')
    expect(dots).toHaveLength(3)
    for (const dot of dots) {
      expect(dot.getAttribute('data-variant')).toBe('drive')
    }
    expect(screen.getByRole('img', { name: /3 drive days/i })).toBeInTheDocument()
  })

  it('pairs dots with the numeric count, singular for count === 1', () => {
    render(<DayDotCluster count={1} variant="stay" />)
    expect(screen.getAllByTestId('dot')).toHaveLength(1)
    expect(screen.getByText('1 day')).toBeInTheDocument()
  })

  it('collapses to a "{N} days" pill above --dot-max-inline-count, no individual dots', () => {
    render(<DayDotCluster count={8} variant="stay" />)
    expect(screen.queryAllByTestId('dot')).toHaveLength(0)
    expect(screen.getByRole('img', { name: /8 stay days/i })).toHaveTextContent('8 days')
  })

  it('renders nothing for a zero/invalid count (legitimate empty state)', () => {
    const { container } = render(<DayDotCluster count={0} variant="drive" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('applies the sm/md/lg size variant to every dot', () => {
    render(<DayDotCluster count={2} variant="drive" size="lg" />)
    for (const dot of screen.getAllByTestId('dot')) {
      expect(dot.getAttribute('data-size')).toBe('lg')
    }
  })
})

describe('Dot (standalone single-dot visual)', () => {
  it('renders with the requested variant and size for self-positioning consumers', () => {
    render(<Dot variant="stay" size="sm" />)
    const dot = screen.getByTestId('dot')
    expect(dot.getAttribute('data-variant')).toBe('stay')
    expect(dot.getAttribute('data-size')).toBe('sm')
  })
})
