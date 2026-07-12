import { useState } from 'react'
import { Info } from 'lucide-react'
import { Dot } from './day-dot-cluster'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip'

/**
 * Slot: the day-dot legend (drive-day rust vs. stay-day dusk color key,
 * DESIGN.md § Day-Marker Dots + Component Rules "Dot legend"). Owner:
 * outbound-p1-fe-06.
 *
 * Rendered as a child of `<Map>` in `src/components/map-canvas.tsx`
 * (fe-02a composition root, never edited here). Persistent bottom-left key
 * at `>=sm` (640px, DESIGN.md § Layout Breakpoints); collapses to a
 * tap-to-reveal info chip below `sm` to preserve map real estate.
 *
 * "Custom component (no Shadcn primitive)" per DESIGN.md Component Rules —
 * the container itself is hand-styled with tokens; only the per-swatch
 * dot-meaning explanation uses Shadcn `<Tooltip>` (also per Component
 * Rules). No global `<TooltipProvider>` exists yet in this app, so one is
 * scoped locally here rather than touching App.tsx.
 */

interface LegendEntryProps {
  variant: 'drive' | 'stay'
  label: string
  description: string
}

function LegendEntry({ variant, label, description }: LegendEntryProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          data-testid={`dot-legend-entry-${variant}`}
          className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-sm)] px-[var(--space-1)] py-[var(--space-1)] text-sm text-[var(--color-text)] focus-visible:outline focus-visible:outline-[var(--marker-focus-ring-width)] focus-visible:outline-[var(--marker-focus-ring-color)] focus-visible:outline-offset-[var(--marker-focus-ring-offset)]"
          aria-label={`${label}: ${description}`}
        >
          <Dot variant={variant} size="sm" />
          <span>{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{description}</TooltipContent>
    </Tooltip>
  )
}

function LegendEntries() {
  return (
    <>
      <LegendEntry
        variant="drive"
        label="Drive day"
        description="One dot = one day of driving (max 10 h/day) along the highlighted route."
      />
      <LegendEntry
        variant="stay"
        label="Stay day"
        description="One dot = one recommended day at the highlighted park."
      />
    </>
  )
}

export function DotLegend() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <TooltipProvider>
      {/* Persistent inline legend, >= sm (DESIGN.md § Layout Breakpoints). */}
      <div
        data-testid="dot-legend"
        className="pointer-events-auto absolute bottom-[var(--space-6)] left-[var(--space-6)] z-10 hidden flex-col gap-[var(--space-1)] rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] p-[var(--space-2)] shadow-[var(--elevation-1)] sm:flex"
      >
        <LegendEntries />
      </div>

      {/* Tap-to-reveal chip, below sm. */}
      <div className="pointer-events-none absolute bottom-[var(--space-6)] left-[var(--space-6)] z-10 sm:hidden">
        <button
          type="button"
          data-testid="dot-legend-chip"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-label="Dot legend: what the drive-day and stay-day dots mean"
          className="pointer-events-auto flex size-11 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] shadow-[var(--elevation-1)]"
        >
          <Info aria-hidden="true" className="size-5" />
        </button>
        {mobileOpen && (
          <div
            data-testid="dot-legend-mobile-panel"
            className="pointer-events-auto mt-[var(--space-2)] flex flex-col gap-[var(--space-1)] rounded-[var(--radius-md)] bg-[var(--color-surface-elevated)] p-[var(--space-2)] shadow-[var(--elevation-1)]"
          >
            <LegendEntries />
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
