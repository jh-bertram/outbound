import { useEffect, useMemo, useState } from 'react'
import { cubicBezier, motion, useReducedMotion } from 'motion/react'
import { Plus, Route, Trash2, X } from 'lucide-react'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { DayDotCluster } from './day-dot-cluster'
import { parks, type Park } from '@/data/parks'
import { driveMatrix } from '@/data/drive-matrix'
import { driveDays, buildItinerary, totalTripDays, FOCO_ID, type ItineraryItem } from '@/lib/trip-math'
import { computeNearbySuggestions, NEARBY_MAX_HOURS, type NearbySuggestion } from '@/lib/nearby-suggestions'
import { useOutboundStore } from '@/lib/store'

/**
 * Slot: the trip-chain builder panel — nearby-park suggestions with
 * incremental day costs, add/remove chain management, and the running
 * total (BRIEF §3.3/§7.4). Owner: outbound-p1-fe-07.
 *
 * Rendered as a child of `<Map>` in `src/components/map-canvas.tsx`
 * (fe-02a composition root, never edited here). All chain mutation goes
 * through fe-03's store actions (`addPark`/`removePark`) — this file holds
 * NO local chain state, and all day-cost math goes through fe-03's
 * `driveDays`/`buildItinerary`/`totalTripDays` — never a local sum.
 *
 * REMEDIATION (outbound-p1-fe-08, sanctioned single-exception edit): the
 * nearby-suggestion computation (`computeNearbySuggestions` + its
 * `NearbySuggestion` type + `NEARBY_MAX_HOURS`/`NEARBY_SUGGESTION_LIMIT`
 * constants) moved VERBATIM to `src/lib/nearby-suggestions.ts` so
 * itinerary-panel.tsx (fe-08, "would add N days" suggestions) can reuse
 * the exact same logic instead of forking it — fe-08's task packet
 * explicitly requires this reuse and the ORC brief carved out this file as
 * "the sanctioned fe-07 reuse path," the one exception to fe-08's
 * otherwise-solo file scope. No behavior change: same function body, same
 * constants, same call sites below.
 */

// DESIGN.md § Layout Breakpoints — md = 768px, same split fe-05's detail
// card uses (right-docked card / bottom sheet). Local copy, not imported:
// park-detail-panel.tsx exports nothing (each fe-02a slot is a
// self-contained file per the composition-root anti-conflict pattern).
const MD_BREAKPOINT_QUERY = '(min-width: 768px)'

// motion/react's `transition` prop takes numeric seconds and an array-form
// cubic-bezier, not a CSS var() string — mirrors tokens.css
// `--motion-card-*` one-directionally, the same documented convention
// already established by park-detail-panel.tsx (fe-05).
const PANEL_ENTER_DURATION_S = 0.32 // --motion-card-enter-duration
const PANEL_CURVE = cubicBezier(0.16, 1, 0.3, 1) // --motion-card-curve

const PARKS_BY_ID = new Map<string, Park>(parks.map((park) => [park.id, park]))

/** One row per drive leg, paired with the stay days at its destination (if any) — the
 * chain-display unit this panel renders. Derived from fe-03's `buildItinerary` output,
 * never recomputed independently. */
interface ChainRow {
  toId: string
  isReturn: boolean
  driveHours: number
  driveDays: number
  stayDays: number | undefined
}

/** One `ChainRow` per drive leg in `itinerary` (fe-03's `buildItinerary` output, return leg
 * included), each carrying its incremental drive cost and the stay days that immediately
 * follow arrival (if the leg doesn't end back at Fort Collins). Pure derivation, no store
 * access — the itinerary itself is the only input. */
function buildChainRows(itinerary: ItineraryItem[]): ChainRow[] {
  const rows: ChainRow[] = []
  for (let i = 0; i < itinerary.length; i++) {
    const item = itinerary[i]
    if (!item || item.type !== 'drive') continue
    const next = itinerary[i + 1]
    const stayDays = next && next.type === 'stay' && next.id === item.toId ? next.days : undefined
    rows.push({
      toId: item.toId,
      isReturn: item.toId === FOCO_ID,
      driveHours: item.hours,
      driveDays: item.days,
      stayDays,
    })
  }
  return rows
}

interface TripPlanning {
  anchorPark: Park
  canAddSelected: boolean
  suggestions: NearbySuggestion[]
  chainRows: ChainRow[]
  totalDays: number
  activeLegId: string | null
  tripChain: string[]
  addPark: (id: string) => void
  removePark: (id: string) => void
}

/** All derived trip-planning state for the current selection/chain, or `null` when there is
 * nothing to show (no drivable selection and an empty chain). The one place this file reads
 * the store and the matrix/park data — every render function below takes plain props. */
function useTripPlanning(): TripPlanning | null {
  const selectedId = useOutboundStore((state) => state.selectedId)
  const tripChain = useOutboundStore((state) => state.tripChain)
  const addPark = useOutboundStore((state) => state.addPark)
  const removePark = useOutboundStore((state) => state.removePark)

  return useMemo(() => {
    const selectedPark = selectedId ? PARKS_BY_ID.get(selectedId) : undefined
    const selectedIsDrivable = selectedPark?.drivable === true
    const lastChainedId = tripChain[tripChain.length - 1]
    const effectiveAnchorId = selectedIsDrivable && selectedId ? selectedId : (lastChainedId ?? null)
    const anchorPark = effectiveAnchorId ? PARKS_BY_ID.get(effectiveAnchorId) : undefined

    // Nothing to anchor suggestions/chain display on: no drivable selection
    // and no existing chain to fall back to.
    if (!effectiveAnchorId || !anchorPark) return null

    const canAddSelected = selectedIsDrivable && !!selectedId && !tripChain.includes(selectedId)
    const suggestions = computeNearbySuggestions(effectiveAnchorId, tripChain)

    const getHoursBetween = (fromId: string, toId: string): number => driveMatrix.hours[fromId]?.[toId] ?? 0
    const getStayDays = (id: string): number => PARKS_BY_ID.get(id)?.recommendedStayDays ?? 0
    const itinerary = tripChain.length > 0 ? buildItinerary(tripChain, getHoursBetween, getStayDays) : []
    const chainRows = buildChainRows(itinerary)
    const totalDays = totalTripDays(itinerary)
    const activeLegId = selectedId && tripChain.includes(selectedId) ? selectedId : null

    return {
      anchorPark,
      canAddSelected,
      suggestions,
      chainRows,
      totalDays,
      activeLegId,
      tripChain,
      addPark,
      removePark,
    }
  }, [selectedId, tripChain, addPark, removePark])
}

// Local copy of park-detail-panel.tsx's (fe-05) identical hook — same
// convention as MD_BREAKPOINT_QUERY above (self-contained slot file, no
// cross-slot import of internals).
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

/** "Add {park} to trip" — the anchor destination itself (distinct from the nearby
 * suggestions below it, which add OTHER parks). DESIGN.md Component Rule: Secondary button,
 * `--color-secondary` fill (two named examples: "Add to trip" AND "Add nearby park" — this
 * is the former). */
function AddSelectedButton({ park, onAdd }: { park: Park; onAdd: () => void }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      data-testid="trip-panel-add-selected"
      onClick={onAdd}
      aria-label={`Add ${park.fullName} to trip`}
    >
      <Plus aria-hidden="true" className="size-3.5" />
      Add {park.fullName} to trip
    </Button>
  )
}

/** Nearby-park suggestion chip — DESIGN.md Component Rule: Shadcn `<Badge
 * variant="outline">`, restyled, clickable, `--radius-full`. Wrapped around a real `<button>`
 * via `asChild` so it is keyboard-navigable (Badge itself renders a `<span>`).
 *
 * All sizing/spacing/radius overrides live on the `<Badge>`'s own `className` (resolved
 * against `badgeVariants`'s base classes via Badge's internal `cn()`/twMerge call — h-5,
 * px-2, py-0.5, overflow-hidden, whitespace-nowrap are correctly superseded there). The
 * inner `<button>` intentionally carries NO conflicting size/spacing/radius utility of its
 * own: Radix `Slot`'s `asChild` className merge (`@radix-ui/react-slot`) is a plain string
 * join, not a twMerge — two DIFFERENT conflicting utilities for the same CSS property on
 * both sides of the merge would leave the winner undefined by Tailwind's build-order rather
 * than DOM order. Keeping every conflicting utility on one side (the Badge) avoids that
 * class entirely. */
function SuggestionChip({ suggestion, onAdd }: { suggestion: NearbySuggestion; onAdd: (id: string) => void }) {
  const days = driveDays(suggestion.hours)
  return (
    <Badge
      asChild
      variant="outline"
      className="h-auto max-w-full items-start gap-[var(--space-1)] overflow-visible rounded-[var(--radius-full)] px-[var(--space-3)] py-[var(--space-1)] whitespace-normal text-xs font-medium"
    >
      <button
        type="button"
        data-testid="trip-panel-suggestion"
        data-park-id={suggestion.park.id}
        onClick={() => onAdd(suggestion.park.id)}
        aria-label={`Add ${suggestion.park.fullName} to trip — ${suggestion.hours.toFixed(1)} hours, ${days} ${days === 1 ? 'day' : 'days'} from ${suggestion.park.id}`}
        className="flex items-center gap-[var(--space-1)] text-foreground hover:opacity-70"
      >
        <Plus aria-hidden="true" className="size-3" />
        {suggestion.park.fullName}
        <span className="font-mono tabular-nums text-muted-foreground">
          · +{suggestion.hours.toFixed(1)} h · {days} {days === 1 ? 'day' : 'days'}
        </span>
      </button>
    </Badge>
  )
}

function SuggestionsSection({
  anchorPark,
  suggestions,
  onAdd,
}: {
  anchorPark: Park
  suggestions: NearbySuggestion[]
  onAdd: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <h3 className="text-sm font-semibold text-foreground">Nearby parks from {anchorPark.fullName}</h3>
      {suggestions.length === 0 ? (
        <p data-testid="trip-panel-suggestions-empty" className="text-sm text-muted-foreground">
          No drivable parks within {NEARBY_MAX_HOURS} h of {anchorPark.fullName} to add.
        </p>
      ) : (
        <div data-testid="trip-panel-suggestions" className="flex flex-wrap gap-[var(--space-2)]">
          {suggestions.map((suggestion) => (
            <SuggestionChip key={suggestion.park.id} suggestion={suggestion} onAdd={onAdd} />
          ))}
        </div>
      )}
    </div>
  )
}

/** A single chained destination's arrival leg — drive-day dots (dimmed per DESIGN.md's
 * multi-leg rule when a different leg is the active one), stay-day dots, and a two-step
 * confirm-to-remove destructive control (DESIGN.md Component Rule: destructive action always
 * paired with a confirmation step). */
function ChainRowView({
  row,
  dimmed,
  pendingRemove,
  onRequestRemove,
  onConfirmRemove,
  onCancelRemove,
}: {
  row: ChainRow
  dimmed: boolean
  pendingRemove: boolean
  onRequestRemove: (id: string) => void
  onConfirmRemove: (id: string) => void
  onCancelRemove: () => void
}) {
  const park = row.isReturn ? undefined : PARKS_BY_ID.get(row.toId)
  const label = row.isReturn ? 'Return to Fort Collins' : (park?.fullName ?? row.toId)

  return (
    <li
      data-testid="trip-panel-chain-leg"
      data-to-id={row.toId}
      className="flex flex-col gap-[var(--space-1)] rounded-[var(--radius-sm)] px-[var(--space-2)] py-[var(--space-2)]"
    >
      <div className="flex items-center justify-between gap-[var(--space-2)]">
        <div className="flex items-center gap-[var(--space-2)]">
          <DayDotCluster count={row.driveDays} variant="drive" size="sm" dimmed={dimmed} />
          <span className="text-sm text-foreground">
            Drive to <span className="font-medium">{label}</span>
          </span>
        </div>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{row.driveHours.toFixed(1)} h</span>
      </div>
      {row.stayDays !== undefined && row.stayDays > 0 && (
        <div className="flex items-center gap-[var(--space-2)] pl-[var(--space-1)]">
          <DayDotCluster count={row.stayDays} variant="stay" size="sm" dimmed={dimmed} />
          <span className="text-xs text-muted-foreground">recommended stay</span>
        </div>
      )}
      {!row.isReturn && park && (
        <div className="flex justify-end gap-[var(--space-2)]">
          {pendingRemove ? (
            <>
              <Button
                type="button"
                variant="destructive"
                size="xs"
                data-testid="trip-panel-remove-confirm"
                data-park-id={park.id}
                onClick={() => onConfirmRemove(park.id)}
                aria-label={`Confirm removing ${park.fullName} from trip`}
              >
                <Trash2 aria-hidden="true" className="size-3" />
                Confirm remove
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                data-testid="trip-panel-remove-cancel"
                onClick={onCancelRemove}
                aria-label="Cancel remove"
              >
                <X aria-hidden="true" className="size-3" />
                Cancel
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="destructive"
              size="xs"
              data-testid="trip-panel-remove"
              data-park-id={park.id}
              onClick={() => onRequestRemove(park.id)}
              aria-label={`Remove ${park.fullName} from trip`}
            >
              <Trash2 aria-hidden="true" className="size-3" />
              Remove
            </Button>
          )}
        </div>
      )}
    </li>
  )
}

function ChainSection({
  chainRows,
  activeLegId,
  removePark,
}: {
  chainRows: ChainRow[]
  activeLegId: string | null
  removePark: (id: string) => void
}) {
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)

  if (chainRows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No parks added yet — add a nearby suggestion below to start your trip.
      </p>
    )
  }

  return (
    <ul data-testid="trip-panel-chain-list" className="flex flex-col gap-[var(--space-1)]">
      {chainRows.map((row) => (
        <ChainRowView
          key={row.toId + (row.isReturn ? '-return' : '')}
          row={row}
          dimmed={activeLegId !== null && row.toId !== activeLegId}
          pendingRemove={pendingRemoveId === row.toId}
          onRequestRemove={setPendingRemoveId}
          onConfirmRemove={(id) => {
            removePark(id)
            setPendingRemoveId(null)
          }}
          onCancelRemove={() => setPendingRemoveId(null)}
        />
      ))}
    </ul>
  )
}

function TripPanelBody({ planning }: { planning: TripPlanning }) {
  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <div className="flex items-center justify-between gap-[var(--space-2)]">
        <h2 className="text-lg font-semibold text-foreground">Your trip</h2>
        {planning.tripChain.length > 0 && (
          <span
            data-testid="trip-panel-total"
            className="font-mono text-sm font-medium tabular-nums text-foreground"
          >
            {planning.totalDays} {planning.totalDays === 1 ? 'day' : 'days'} total
          </span>
        )}
      </div>

      <ChainSection chainRows={planning.chainRows} activeLegId={planning.activeLegId} removePark={planning.removePark} />

      {planning.canAddSelected && <AddSelectedButton park={planning.anchorPark} onAdd={() => planning.addPark(planning.anchorPark.id)} />}

      <SuggestionsSection anchorPark={planning.anchorPark} suggestions={planning.suggestions} onAdd={planning.addPark} />
    </div>
  )
}

/** Floating card docked top-left at >=md. Detail card (fe-05) is right-docked
 * (top/right/bottom-[var(--space-24)]) and the dot legend (fe-06) is pinned bottom-left
 * (--space-6) — top-left with a capped height is the one desktop quadrant neither of those
 * two slots claims, so this panel never occludes either (a documented placement choice, no
 * DESIGN.md token specifies trip-panel position).
 *
 * Enter-only motion (no `AnimatePresence`): `TripPanel` unmounts this whole component
 * directly (returns `null`) rather than keeping it mounted for an exit transition — the same
 * "no exit animation, mount/unmount is instant" tradeoff already accepted by dot-legend.tsx's
 * mobile panel toggle, not a functional gap this task needs to close. */
function DesktopTripCard({ planning }: { planning: TripPlanning }) {
  const prefersReducedMotion = useReducedMotion() ?? false

  return (
    <motion.div
      data-testid="trip-panel"
      className="pointer-events-auto absolute top-[var(--space-24)] left-[var(--space-24)] z-20 max-h-[55vh] w-[320px]"
      initial={prefersReducedMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : PANEL_ENTER_DURATION_S, ease: PANEL_CURVE }}
    >
      <Card className="max-h-[55vh] overflow-hidden rounded-[var(--radius-lg)] p-0 shadow-[var(--elevation-2)]">
        <ScrollArea className="max-h-[55vh]">
          <div className="p-[var(--space-4)]">
            <TripPanelBody planning={planning} />
          </div>
        </ScrollArea>
      </Card>
    </motion.div>
  )
}

/** Below md: collapses to a tap-to-reveal chip (mirrors the dot-legend's own mobile
 * convention, fe-06) rather than a Shadcn `Sheet`/`Drawer` — DESIGN.md reserves the
 * full-screen-overlay-via-FAB treatment specifically for the itinerary panel (fe-08, out of
 * this task's scope); this panel must not occlude the map when collapsed. */
function MobileTripChip({ planning }: { planning: TripPlanning }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="pointer-events-none absolute right-[var(--space-6)] bottom-[var(--space-6)] z-20">
      {open && (
        <Card
          data-testid="trip-panel-mobile-panel"
          className="pointer-events-auto mb-[var(--space-2)] max-h-[60vh] w-[85vw] max-w-[340px] overflow-hidden rounded-[var(--radius-lg)] p-0 shadow-[var(--elevation-2)]"
        >
          <ScrollArea className="max-h-[60vh]">
            <div className="p-[var(--space-4)]">
              <TripPanelBody planning={planning} />
            </div>
          </ScrollArea>
        </Card>
      )}
      <button
        type="button"
        data-testid="trip-panel-mobile-chip"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Collapse trip panel' : 'Expand trip panel'}
        className="pointer-events-auto ml-auto flex size-11 items-center justify-center gap-1 rounded-[var(--radius-full)] bg-[var(--color-surface-elevated)] text-[var(--color-text)] shadow-[var(--elevation-1)]"
      >
        <Route aria-hidden="true" className="size-5" />
        {planning.tripChain.length > 0 && (
          <span className="sr-only">{planning.tripChain.length} parks in trip</span>
        )}
      </button>
    </div>
  )
}

export function TripPanel() {
  const planning = useTripPlanning()
  const isDesktop = useIsDesktopViewport()

  if (!planning) return null

  return isDesktop ? <DesktopTripCard planning={planning} /> : <MobileTripChip planning={planning} />
}
