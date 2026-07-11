import type { CSSProperties } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

/**
 * Day-dot primitive — the app's signature visual language (DESIGN.md
 * Constitution + § Day-Marker Dots). This is the ONE shared implementation;
 * downstream tasks (map markers, route overlays, itinerary rows) consume
 * `Dot` / `DayDotCluster` rather than forking their own dot rendering.
 *
 * Pure and presentational — props only, no store or park-data imports.
 */

export type DotVariant = 'drive' | 'stay'
export type DotSize = 'sm' | 'md' | 'lg'

// DESIGN.md § Day-Marker Dot Tokens — --dot-max-inline-count.
const DOT_MAX_INLINE_COUNT = 5

// motion/react's `transition` prop takes numeric seconds and an array-form
// cubic-bezier, not CSS custom-property strings — these mirror
// src/styles/tokens.css one-directionally (documented, not duplicated
// logic: the two systems can't share a single definition without a
// runtime getComputedStyle() read, which is unwarranted here).
const DOT_STAGGER_DELAY_S = 0.09 // --motion-dot-stagger-delay: 90ms
const DOT_ENTER_DURATION_S = 0.22 // --motion-dot-enter-duration: 220ms
const DOT_ENTER_EASE: [number, number, number, number] = [0.34, 1.56, 0.64, 1] // --motion-dot-enter-curve

const DOT_SIZE_CLASS: Record<DotSize, string> = {
  sm: 'size-[var(--dot-size-sm)]',
  md: 'size-[var(--dot-size-md)]',
  lg: 'size-[var(--dot-size-lg)]',
}

// Decorative dot fill — safe to use --dot-color-drive (accent-rust)
// directly here because no text is ever rendered on top of a dot circle
// (DESIGN.md Design Integrity Notes: accent-rust fails AA as filled-button
// TEXT, not as a non-text decorative fill, which only needs the 3:1
// non-text minimum it already passes at 4.27:1).
const DOT_COLOR_CLASS: Record<DotVariant, string> = {
  drive: 'bg-[var(--dot-color-drive)]',
  stay: 'bg-[var(--dot-color-stay)]',
}

// The count-pill (>5 collapse) renders TEXT on its fill, unlike an
// individual dot. --dot-color-drive (accent-rust) is explicitly flagged in
// DESIGN.md as unsafe for filled-button/text-bearing surfaces, so the
// drive-variant pill substitutes the button-safe --color-secondary (same
// rust family, AA-verified at 5.61:1 with inverse text) instead of reusing
// DOT_COLOR_CLASS. The stay-variant pill reuses --dot-color-stay directly
// since dusk is already AAA-verified with inverse text (8.27:1) — no
// substitution needed. This is a token CHOICE for a case DESIGN.md's
// tables don't address directly (no pill-background token exists), guided
// by DESIGN.md's own explicit contrast rules, not a silent value change.
const PILL_BG_CLASS: Record<DotVariant, string> = {
  drive: 'bg-[var(--color-secondary)]',
  stay: 'bg-[var(--dot-color-stay)]',
}

function formatDayCount(count: number, variant?: DotVariant): string {
  const suffix = count === 1 ? 'day' : 'days'
  return variant ? `${count} ${variant} ${suffix}` : `${count} ${suffix}`
}

export interface DotProps {
  /** Drive-day (rust) vs. stay-day (dusk) — DESIGN.md dot color families, never interchanged. */
  variant: DotVariant
  /** sm = on/adjacent to a marker, md = along a route line, lg = itinerary panel day rows. */
  size?: DotSize
  /** Backgrounded/non-active trip leg — DESIGN.md 40% opacity dimmed state. */
  dimmed?: boolean
  /** Stagger index for entrance animation (0-based). Pass when a consumer renders its own
   *  list of Dots (e.g. an along-route overlay that positions each dot itself) so entrance
   *  timing matches DayDotCluster's convention. */
  index?: number
  className?: string
  /** Passthrough for consumer-owned positioning (e.g. absolute x/y along a route path). */
  style?: CSSProperties
}

/** Single-dot visual — exported standalone for consumers that position dots themselves. */
export function Dot({
  variant,
  size = 'md',
  dimmed = false,
  index = 0,
  className,
  style,
}: DotProps) {
  const prefersReducedMotion = useReducedMotion() ?? false

  return (
    <motion.span
      data-testid="dot"
      data-variant={variant}
      data-size={size}
      aria-hidden="true"
      className={cn(
        'inline-block rounded-full',
        DOT_SIZE_CLASS[size],
        DOT_COLOR_CLASS[variant],
        dimmed && 'opacity-[var(--dot-dimmed-opacity)]',
        className,
      )}
      style={{
        // DESIGN.md: "halo/stroke pattern on every map-canvas dot ... is
        // load-bearing, not decorative" — guarantees contrast against an
        // unpredictable basemap independent of fill hue.
        boxShadow: '0 0 0 var(--dot-stroke-width) var(--dot-stroke-color)',
        ...style,
      }}
      initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : {
              duration: DOT_ENTER_DURATION_S,
              delay: index * DOT_STAGGER_DELAY_S,
              ease: DOT_ENTER_EASE,
            }
      }
    />
  )
}

export interface DayDotClusterProps {
  /** Number of days represented — one dot per day, or a "{N} days" pill above DESIGN.md's inline-count ceiling (5). */
  count: number
  /** Drive-day (rust) vs. stay-day (dusk). */
  variant: DotVariant
  /** sm/md/lg — see DotProps. Default 'md'. */
  size?: DotSize
  /** Backgrounded/non-active trip leg — 40% opacity. */
  dimmed?: boolean
  className?: string
  /** Accessible label override; defaults to "{count} drive/stay day(s)". */
  'aria-label'?: string
}

/**
 * Dot row/cluster — renders exactly N dots for `count`, or collapses to a
 * "{N} days" pill above `--dot-max-inline-count`. Always pairs dots with
 * the numeric count (DESIGN.md Constitution: "Dots read first; the number
 * confirms" — never color/shape alone).
 */
export function DayDotCluster({
  count,
  variant,
  size = 'md',
  dimmed = false,
  className,
  'aria-label': ariaLabel,
}: DayDotClusterProps) {
  const safeCount = Number.isFinite(count) ? Math.max(0, Math.round(count)) : 0

  // Zero days is a legitimate empty state (e.g. a park with no recommended
  // stay) — rendering nothing IS the correct state, not an error.
  if (safeCount <= 0) {
    return null
  }

  // Accessible name includes the variant word (screen readers can't
  // perceive the rust/dusk color distinction) even though the paired
  // visible label omits it per DESIGN.md's literal "●●● 3 days" example.
  const label = ariaLabel ?? formatDayCount(safeCount, variant)

  if (safeCount > DOT_MAX_INLINE_COUNT) {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn(
          'inline-flex items-center rounded-[var(--radius-full)] px-[var(--space-2)] py-[var(--space-1)] font-mono text-xs font-medium text-[var(--color-text-inverse)]',
          PILL_BG_CLASS[variant],
          dimmed && 'opacity-[var(--dot-dimmed-opacity)]',
          className,
        )}
      >
        {formatDayCount(safeCount)}
      </span>
    )
  }

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-[var(--dot-gap)]',
        dimmed && 'opacity-[var(--dot-dimmed-opacity)]',
        className,
      )}
    >
      <span className="inline-flex items-center gap-[var(--dot-gap)]" aria-hidden="true">
        {Array.from({ length: safeCount }, (_, i) => (
          <Dot key={i} variant={variant} size={size} index={i} />
        ))}
      </span>
      <span className="font-mono text-sm text-[var(--color-text)]">
        {formatDayCount(safeCount)}
      </span>
    </span>
  )
}
