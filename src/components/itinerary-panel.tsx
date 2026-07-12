import { useEffect, useMemo, useState } from 'react'
import { cubicBezier, motion, useReducedMotion } from 'motion/react'
import { CalendarDays, TriangleAlert } from 'lucide-react'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { ScrollArea } from './ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from './ui/sheet'
import { DayDotCluster } from './day-dot-cluster'
import { parks, type Park } from '@/data/parks'
import { driveMatrix } from '@/data/drive-matrix'
import { buildItinerary, totalTripDays, FOCO_ID, type ItineraryItem } from '@/lib/trip-math'
import { computeNearbySuggestions } from '@/lib/nearby-suggestions'
import { useOutboundStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * Slot: the day-by-day itinerary breakdown, including the return leg to
 * Fort Collins (BRIEF §7.4). Owner: outbound-p1-fe-08.
 *
 * Rendered as a child of `<Map>` in `src/components/map-canvas.tsx`
 * (fe-02a composition root, never edited here). All itinerary math goes
 * through fe-03's `buildItinerary`/`totalTripDays` — this file holds NO
 * local day-count sum. The nearby-suggestion candidate search is fe-07's
 * `computeNearbySuggestions`, imported from the shared `src/lib/
 * nearby-suggestions.ts` module (extracted out of trip-panel.tsx by this
 * task, the one sanctioned exception to fe-08's otherwise-solo file scope
 * — see trip-panel.tsx's own REMEDIATION comment) rather than re-forked.
 */

// DESIGN.md § Layout Breakpoints — md = 768px. Local copy, not imported:
// each fe-02a slot is a self-contained file per the composition-root
// anti-conflict pattern (same convention trip-panel.tsx/park-detail-panel.tsx use).
const MD_BREAKPOINT_QUERY = '(min-width: 768px)'

// motion/react's `transition` prop takes numeric seconds and an array-form
// cubic-bezier, not a CSS var() string — mirrors tokens.css
// `--motion-card-*` one-directionally, the same documented convention
// already established by trip-panel.tsx / park-detail-panel.tsx.
const PANEL_ENTER_DURATION_S = 0.32 // --motion-card-enter-duration
const PANEL_CURVE = cubicBezier(0.16, 1, 0.3, 1) // --motion-card-curve

// DESIGN.md § Color Tokens: "--color-warning ... Warning states — long-drive-day flags
// (3+ day legs)". The literal threshold DESIGN.md's prose names.
const WARNING_DRIVE_DAYS_THRESHOLD = 3

const PARKS_BY_ID = new Map<string, Park>(parks.map((park) => [park.id, park]))

/** One itinerary item paired with its computed "Day N" / "Day N–M" range label. */
interface DayRangeRow {
  item: ItineraryItem
  startDay: number
  endDay: number
}

/** How many additional trip-total days a not-yet-chained nearby destination would add if
 * appended to the end of the current chain (BRIEF §4: "suggestions for how many days other
 * (nearby, not-yet-added) parks would add"). */
interface AddDaysSuggestion {
  park: Park
  addDays: number
}

/** Walks `itinerary` (fe-03's `buildItinerary` output, return leg included) once, computing
 * each item's day range from its own `.days` — the only place this file touches day-count
 * arithmetic, and it never re-derives a day count fe-03 already produced. */
function computeDayRanges(itinerary: ItineraryItem[]): DayRangeRow[] {
  let cumulative = 0
  return itinerary.map((item) => {
    const startDay = cumulative + 1
    cumulative += item.days
    return { item, startDay, endDay: cumulative }
  })
}

function formatDayRange(startDay: number, endDay: number): string {
  return startDay === endDay ? `Day ${startDay}` : `Day ${startDay}–${endDay}`
}

function itineraryRowKey(item: ItineraryItem): string {
  return item.type === 'drive' ? `drive-${item.fromId}-${item.toId}` : `stay-${item.id}`
}

/** For each nearby candidate (fe-07's shared `computeNearbySuggestions`, anchored on the
 * LAST chained destination — the natural extension point), the day cost of appending it:
 * `totalTripDays` with the candidate appended minus the current chain's `totalTripDays`.
 * This correctly accounts for the new leg's drive+stay days AND the return-leg delta (the
 * old anchor->FoCo leg is replaced by a new candidate->FoCo leg) — never a bare incremental
 * drive-hour figure (that's trip-panel.tsx's "Nearby parks" chip, a different question).
 * Reuses `buildItinerary`/`totalTripDays` (fe-03) and `computeNearbySuggestions` (shared
 * fe-07 util) exclusively — no independent matrix logic. */
function computeAddDaysSuggestions(
  tripChain: string[],
  currentTotalDays: number,
  getHoursBetween: (fromId: string, toId: string) => number,
  getStayDays: (id: string) => number,
): AddDaysSuggestion[] {
  const anchorId = tripChain[tripChain.length - 1]
  if (!anchorId) return []

  const nearby = computeNearbySuggestions(anchorId, tripChain)

  return nearby.map((suggestion) => {
    const withSuggestion = buildItinerary([...tripChain, suggestion.park.id], getHoursBetween, getStayDays)
    return { park: suggestion.park, addDays: totalTripDays(withSuggestion) - currentTotalDays }
  })
}

interface ItineraryData {
  tripChain: string[]
  dayRanges: DayRangeRow[]
  totalDays: number
  addDaysSuggestions: AddDaysSuggestion[]
}

/** All derived itinerary state for the current chain, or `null` when the chain is empty (the
 * itinerary is reached "by clicking the first destination," BRIEF §4 — nothing to show for
 * an empty trip). The one place this file reads the store and the matrix/park data — every
 * render function below takes plain props. */
function useItineraryData(): ItineraryData | null {
  const tripChain = useOutboundStore((state) => state.tripChain)

  return useMemo(() => {
    if (tripChain.length === 0) return null

    const getHoursBetween = (fromId: string, toId: string): number => driveMatrix.hours[fromId]?.[toId] ?? 0
    const getStayDays = (id: string): number => PARKS_BY_ID.get(id)?.recommendedStayDays ?? 0

    const itinerary = buildItinerary(tripChain, getHoursBetween, getStayDays)
    const dayRanges = computeDayRanges(itinerary)
    const totalDays = totalTripDays(itinerary)
    const addDaysSuggestions = computeAddDaysSuggestions(tripChain, totalDays, getHoursBetween, getStayDays)

    return { tripChain, dayRanges, totalDays, addDaysSuggestions }
  }, [tripChain])
}

// Local copy of trip-panel.tsx's / park-detail-panel.tsx's identical hook — same
// self-contained-slot-file convention (see MD_BREAKPOINT_QUERY above).
function useIsDesktopViewport(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(MD_BREAKPOINT_QUERY).matches,
  )

  useEffect(() => {
    const mql = window.matchMedia(MD_BREAKPOINT_QUERY)
    const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return isDesktop
}

/** A single day-by-day row — a drive leg (incl. the explicit return-to-Fort-Collins leg,
 * flagged with `--color-warning` at >=3 days) or a destination stay. DESIGN.md: day rows use
 * `--color-surface-sunken`; in-panel dots at `--dot-size-lg`; mono numerals for day/hours. */
function ItineraryRowView({ row }: { row: DayRangeRow }) {
  const { item, startDay, endDay } = row
  const dayLabel = formatDayRange(startDay, endDay)

  if (item.type === 'drive') {
    const isReturn = item.toId === FOCO_ID
    const destinationPark = isReturn ? undefined : PARKS_BY_ID.get(item.toId)
    const destinationLabel = isReturn ? 'Fort Collins' : (destinationPark?.fullName ?? item.toId)
    const isWarning = item.days >= WARNING_DRIVE_DAYS_THRESHOLD

    return (
      <li
        data-testid="itinerary-row"
        data-row-type="drive"
        data-to-id={item.toId}
        data-is-return={isReturn}
        className="flex items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-sm)] bg-[var(--color-surface-sunken)] px-[var(--space-3)] py-[var(--space-2)]"
      >
        <div className="flex items-center gap-[var(--space-2)]">
          <DayDotCluster count={item.days} variant="drive" size="lg" />
          <div className="flex flex-col">
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{dayLabel}</span>
            <span
              className={cn('text-sm text-foreground', isWarning && 'font-medium text-[var(--color-warning)]')}
            >
              {isReturn ? 'Return drive to' : 'Drive to'} {destinationLabel}{' '}
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                ({item.hours.toFixed(1)} h)
              </span>
            </span>
          </div>
        </div>
        {isWarning && (
          <span
            data-testid="itinerary-warning-flag"
            role="img"
            aria-label={`Long drive day: ${item.days} days`}
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--color-warning)]"
          >
            <TriangleAlert aria-hidden="true" className="size-3.5" />
            Long drive
          </span>
        )}
      </li>
    )
  }

  const park = PARKS_BY_ID.get(item.id)

  return (
    <li
      data-testid="itinerary-row"
      data-row-type="stay"
      data-to-id={item.id}
      className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-sm)] px-[var(--space-3)] py-[var(--space-2)]"
    >
      <DayDotCluster count={item.days} variant="stay" size="lg" />
      <div className="flex flex-col">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{dayLabel}</span>
        <span className="text-sm text-foreground">
          {park?.fullName ?? item.id}{' '}
          <span className="text-xs text-muted-foreground">
            ({item.days} recommended {item.days === 1 ? 'day' : 'days'})
          </span>
        </span>
      </div>
    </li>
  )
}

/** "Nearby parks would add" — informational only (no click handler): adding a park to the
 * chain is trip-panel.tsx's (fe-07) action via `addPark`; duplicating that mutation entry
 * point here would fork the "add" affordance across two files for one store action. */
function AddDaysSuggestions({ suggestions }: { suggestions: AddDaysSuggestion[] }) {
  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <h3 className="text-sm font-semibold text-foreground">Nearby parks would add</h3>
      {suggestions.length === 0 ? (
        <p data-testid="itinerary-add-days-empty" className="text-sm text-muted-foreground">
          No nearby parks to suggest from the end of this trip.
        </p>
      ) : (
        <div data-testid="itinerary-add-days-suggestions" className="flex flex-wrap gap-[var(--space-2)]">
          {suggestions.map((suggestion) => (
            <Badge
              key={suggestion.park.id}
              variant="outline"
              data-testid="itinerary-add-days-suggestion"
              data-park-id={suggestion.park.id}
              className="h-auto max-w-full items-start gap-[var(--space-1)] overflow-visible rounded-[var(--radius-full)] px-[var(--space-3)] py-[var(--space-1)] whitespace-normal text-xs font-medium"
            >
              {suggestion.park.fullName}
              <span className="font-mono tabular-nums text-muted-foreground">
                · +{suggestion.addDays} {suggestion.addDays === 1 ? 'day' : 'days'}
              </span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function ItineraryPanelBody({ dayRanges, totalDays, addDaysSuggestions }: Omit<ItineraryData, 'tripChain'>) {
  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex items-center justify-between gap-[var(--space-2)]">
        <h2 className="text-lg font-semibold text-foreground">Your itinerary</h2>
        <span data-testid="itinerary-total" className="font-mono text-sm font-medium tabular-nums text-foreground">
          {totalDays} {totalDays === 1 ? 'day' : 'days'} total
        </span>
      </div>

      <ol data-testid="itinerary-list" className="flex flex-col gap-[var(--space-1)]">
        {dayRanges.map((row) => (
          <ItineraryRowView key={itineraryRowKey(row.item)} row={row} />
        ))}
      </ol>

      <AddDaysSuggestions suggestions={addDaysSuggestions} />
    </div>
  )
}

/** Persistent side panel at >=md. Docked in the same left rail as trip-panel.tsx (fe-07),
 * stacked directly below it, rather than the already-claimed right column (park-detail-
 * panel.tsx) or bottom-left corner (dot-legend.tsx). Safe to assume trip-panel is always
 * rendered whenever this panel is (a non-empty `tripChain` guarantees trip-panel's own
 * anchor fallback — "selected OR last-chained destination" — resolves), so the two never
 * fight for the same vertical space: trip-panel caps itself at `max-h-[55vh]` from
 * `top-[var(--space-24)]`, and this panel starts exactly where that cap ends. */
function DesktopItineraryPanel({ dayRanges, totalDays, addDaysSuggestions }: Omit<ItineraryData, 'tripChain'>) {
  const prefersReducedMotion = useReducedMotion() ?? false

  return (
    <motion.div
      data-testid="itinerary-panel"
      className="pointer-events-auto absolute top-[calc(var(--space-24)+55vh+var(--space-4))] bottom-[var(--space-24)] left-[var(--space-24)] z-20 w-[320px]"
      initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : PANEL_ENTER_DURATION_S, ease: PANEL_CURVE }}
    >
      <Card className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] p-0 shadow-[var(--elevation-2)]">
        <ScrollArea className="flex-1">
          <div className="p-[var(--space-4)]">
            <ItineraryPanelBody dayRanges={dayRanges} totalDays={totalDays} addDaysSuggestions={addDaysSuggestions} />
          </div>
        </ScrollArea>
      </Card>
    </motion.div>
  )
}

/** Below md: a floating action button (top-right — the one mobile corner unclaimed by
 * trip-panel.tsx's chip (bottom-right) and dot-legend.tsx's chip (bottom-left)) that opens
 * the itinerary as a FULL-SCREEN Shadcn `Sheet` overlay (DESIGN.md § Layout Breakpoints:
 * "the itinerary panel becomes a full-screen overlay below md ... reached via a floating
 * action button, not a persistent side panel"). `Sheet` is a Radix `Dialog` under the hood —
 * focus trapping, `role="dialog"`/`aria-modal`, and Escape-to-close are handled by the
 * primitive itself; no hand-rolled `getFocusableElements` query exists in this file
 * (Focus-Trap Pre-Flight N/A). The `!`-prefixed overrides below are a deliberate,
 * documented use of Tailwind's important-modifier: SheetContent's own `data-[side=bottom]:
 * ...` base classes (h-auto, border-t, inset-x-0/bottom-0 only) are themselves
 * modifier-scoped, and using plain (unprefixed) overrides risks losing to them on CSS
 * source order rather than intent — `!` sidesteps that ambiguity entirely instead of
 * fighting tailwind-merge's conflict-group resolution for a one-off full-bleed override. */
function MobileItineraryFab({ dayRanges, totalDays, addDaysSuggestions }: Omit<ItineraryData, 'tripChain'>) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="pointer-events-none absolute top-[var(--space-6)] right-[var(--space-6)] z-20">
        <button
          type="button"
          data-testid="itinerary-fab"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Open day-by-day itinerary — ${totalDays} ${totalDays === 1 ? 'day' : 'days'} total`}
          className="pointer-events-auto flex size-11 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] shadow-[var(--elevation-1)]"
        >
          <CalendarDays aria-hidden="true" className="size-5" />
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          data-testid="itinerary-mobile-overlay"
          side="bottom"
          className="!inset-0 !h-full !w-full !max-w-none !rounded-none !border-none"
        >
          <SheetHeader>
            <SheetTitle>Your itinerary</SheetTitle>
            <SheetDescription className="sr-only">
              Day-by-day breakdown of your trip, including the return drive to Fort Collins.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="px-[var(--space-4)] pb-[var(--space-6)]">
              <ItineraryPanelBody
                dayRanges={dayRanges}
                totalDays={totalDays}
                addDaysSuggestions={addDaysSuggestions}
              />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}

export function ItineraryPanel() {
  const data = useItineraryData()
  const isDesktop = useIsDesktopViewport()

  if (!data) return null

  return isDesktop ? (
    <DesktopItineraryPanel
      dayRanges={data.dayRanges}
      totalDays={data.totalDays}
      addDaysSuggestions={data.addDaysSuggestions}
    />
  ) : (
    <MobileItineraryFab
      dayRanges={data.dayRanges}
      totalDays={data.totalDays}
      addDaysSuggestions={data.addDaysSuggestions}
    />
  )
}
