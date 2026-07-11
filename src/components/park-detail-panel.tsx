import { useEffect, useState } from 'react'
import { useMap } from '@vis.gl/react-maplibre'
import { AnimatePresence, cubicBezier, motion, useReducedMotion } from 'motion/react'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Card } from './ui/card'
import { Badge } from './ui/badge'
import { Skeleton } from './ui/skeleton'
import { DayDotCluster } from './day-dot-cluster'
import { parks, type Park } from '@/data/parks'
import type { NpsParkContent } from '@/data/nps-content'
import { driveMatrix } from '@/data/drive-matrix'
import { driveDays, FOCO_ID } from '@/lib/trip-math'
import { useOutboundStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * Slot: floating detail card for the selected destination — description,
 * photos, drive/stay stats, campground links, and the animated fly-to
 * (BRIEF §7.2). Owner: outbound-p1-fe-05.
 *
 * Rendered as a child of `<Map>` in `src/components/map-canvas.tsx`
 * (fe-02a composition root, never edited here) so this file has direct
 * MapContext access (`useMap()` for camera control).
 *
 * DESIGN.md's Layout Breakpoints prose describes the mobile bottom-sheet
 * peek as showing "name + drive-day dots"; the fe-05 task packet (the
 * authoritative single source for this task) specifies "name + stay-day
 * dots" instead. Followed literally here — flagged in this task's
 * ui_packet as a DESIGN.md/task-packet wording mismatch for UI Designer
 * awareness, not silently resolved either way.
 */

// DESIGN.md § Layout Breakpoints — md = 768px is the exact split this task
// must implement (right-docked card at >=md, bottom sheet below).
const MD_BREAKPOINT_QUERY = '(min-width: 768px)'

// motion/react's imperative flyTo/transition APIs take numeric seconds and
// array-form cubic-beziers, not CSS var() strings — the same documented
// one-directional token mirror established by day-dot-cluster.tsx (fe-01)
// and map-canvas.tsx's GlobeIntro (fe-02b): no runtime getComputedStyle()
// read, values kept in sync by hand against src/styles/tokens.css.
const FLYTO_DURATION_MS = 1400 // --motion-flyto-duration
const FLYTO_EASING = cubicBezier(0.25, 0.1, 0.25, 1) // --motion-flyto-curve
const REDUCED_MOTION_FLYTO_DURATION_MS = 1 // --motion-reduced-motion-override
// Mirrors map-canvas.tsx GlobeIntro's own settle tolerance (same
// convention, local copy — map-canvas.tsx exports nothing and is frozen
// after fe-02b, B3, so it cannot be imported from here).
const FLYTO_SETTLE_ZOOM_TOLERANCE = 0.05
// DESIGN.md ships duration/curve tokens for the fly-to camera move but no
// numeric zoom target for "a single selected park" (only the unrelated
// globe-intro zoom lives in map-canvas.tsx). Chosen as a reasonable
// close-in park-scale zoom — a documented judgment call, not a token
// value, the same treatment fe-02b gave its own GLOBE_INTRO_ZOOM.
const SELECTED_PARK_FLYTO_ZOOM = 8

const CARD_ENTER_DURATION_S = 0.32 // --motion-card-enter-duration
const CARD_CURVE = cubicBezier(0.16, 1, 0.3, 1) // --motion-card-curve

const MAX_VISIBLE_ACTIVITIES = 6

const HEADLINE_CLASS = 'font-display text-4xl leading-[var(--line-height-heading)] text-foreground'

const PARKS_BY_ID = new Map<string, Park>(parks.map((park) => [park.id, park]))

// REMEDIATION (attempt 1, AUD#11 QA FAIL): `@/data/nps-content` re-exports
// `npsContent`, built by parsing the 723 KB nps-content.json at module load
// (src/data/nps-content.ts). A static `import { npsContent } from
// '@/data/nps-content'` therefore bundles that entire JSON payload into
// whatever chunk statically imports it — this file was the SOLE rendered-code
// importer, so it landed in the main entry chunk (341 kB -> 1,193 kB,
// +852 kB, breaching the 1 MB non-maplibre gate and, as a side effect,
// slowing initial page load enough to break fe-04's markers.spec.ts
// actionability waits). Fix: never statically import the value export —
// only the `NpsParkContent` TYPE (erased at build, zero runtime cost) is
// imported above. The actual content module is fetched via a cached dynamic
// `import()` below, resolved on first park selection, so Vite emits it as
// its own async chunk instead of inlining it into the entry bundle.
type NpsContentModule = typeof import('@/data/nps-content')

let npsContentModulePromise: Promise<NpsContentModule> | null = null

function loadNpsContentModule(): Promise<NpsContentModule> {
  if (!npsContentModulePromise) {
    npsContentModulePromise = import('@/data/nps-content')
  }
  return npsContentModulePromise
}

/** Resolves NPS content for `parkCode` from the lazily-loaded, module-scope-cached
 * content chunk above. `loading` is true only for the async gap before that
 * (cached-after-first-use) chunk resolves — `ParkPhoto`'s existing Skeleton covers
 * this same gap it already covered for the per-image onLoad/onError wait, so no new
 * loading UI was introduced.
 *
 * `resolved` only ever gets a `setState` call from the async `.then()` callback (an
 * external-system subscription, the pattern react-hooks/set-state-in-effect expects) —
 * the "no park selected" / "still loading" cases are DERIVED during render instead of
 * synchronously set from the effect body, so no cascading-render setState calls occur. */
function useNpsContent(parkCode: string | undefined): {
  content: NpsParkContent | undefined
  loading: boolean
} {
  const [resolved, setResolved] = useState<{ parkCode: string; content: NpsParkContent | undefined } | null>(null)

  useEffect(() => {
    if (!parkCode) return
    let cancelled = false
    loadNpsContentModule().then((mod) => {
      if (!cancelled) setResolved({ parkCode, content: mod.npsContent[parkCode] })
    })
    return () => {
      cancelled = true
    }
  }, [parkCode])

  if (!parkCode) return { content: undefined, loading: false }
  if (resolved && resolved.parkCode === parkCode) return { content: resolved.content, loading: false }
  return { content: undefined, loading: true }
}

// Same remediation, same pattern, second contributor: `./ui/drawer` (vaul's Radix-Dialog-
// based sheet primitive) is a mobile-only affordance (`MobileDetailSheet`, <768px) but was
// previously statically imported at the top of this file, so its ~270 kB of primitive code
// landed in the SHARED entry chunk for every viewport (desktop included) regardless of
// whether it ever renders. Measured effect: even after the nps-content fix alone, the entry
// chunk was 614.57 kB (vs. the 341.04 kB true baseline) and fe-04's markers.spec.ts still
// reproducibly failed 2/8 (both projects, same failure signature as the original QA FAIL) —
// so this second, `./ui/drawer`-only split was required to close the gap. `./ui/drawer` is a
// pre-existing shared shadcn primitive (not created by this task); only the import site here
// changed from static to a cached dynamic import, mirroring `loadNpsContentModule` above.
type DrawerModule = typeof import('./ui/drawer')

let drawerModulePromise: Promise<DrawerModule> | null = null

function loadDrawerModule(): Promise<DrawerModule> {
  if (!drawerModulePromise) {
    drawerModulePromise = import('./ui/drawer')
  }
  return drawerModulePromise
}

/** Resolves once on mount (module-scope-cached thereafter, so every subsequent mobile
 * sheet mount — i.e. every later park selection — gets it synchronously via the resolved
 * promise's microtask). `MobileDetailSheet` renders nothing for this one-time async gap,
 * the same "nothing yet" treatment `ParkDetailPanel` already gives "no park selected" —
 * no new loading chrome, and safely hidden behind the 1400ms fly-to animation that every
 * e2e assertion already waits out before checking the sheet. */
function useDrawerModule(): DrawerModule | null {
  const [mod, setMod] = useState<DrawerModule | null>(null)

  useEffect(() => {
    let cancelled = false
    loadDrawerModule().then((loaded) => {
      if (!cancelled) setMod(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return mod
}

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

/** Flies the map camera to `park`'s routing coordinate whenever selection changes. */
function useParkDetailFlyTo(park: Park | undefined): void {
  const { current } = useMap()

  useEffect(() => {
    if (!current || !park) return
    const map = current.getMap()
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    map.flyTo({
      center: [park.routingCoord.lng, park.routingCoord.lat],
      zoom: SELECTED_PARK_FLYTO_ZOOM,
      duration: prefersReducedMotion ? REDUCED_MOTION_FLYTO_DURATION_MS : FLYTO_DURATION_MS,
      easing: FLYTO_EASING,
    })

    // Deterministic settle signal for e2e (mirrors GlobeIntro's own
    // pattern in map-canvas.tsx) — a distinct dataset key so it never
    // collides with the intro fly-in's own 'flytoSettled' flag.
    const handleMoveEnd = () => {
      if (Math.abs(map.getZoom() - SELECTED_PARK_FLYTO_ZOOM) > FLYTO_SETTLE_ZOOM_TOLERANCE) return
      document.body.dataset['parkDetailFlytoSettled'] = park.id
      map.off('moveend', handleMoveEnd)
    }
    map.on('moveend', handleMoveEnd)
    return () => {
      map.off('moveend', handleMoveEnd)
    }
  }, [current, park])
}

function ParkPhoto({
  image,
  parkName,
  contentLoading = false,
}: {
  image: NpsParkContent['images'][number] | undefined
  parkName: string
  /** True while the lazy-loaded nps-content chunk (see `useNpsContent` above) hasn't
   * resolved yet for the current selection — `image` is necessarily still `undefined`
   * in that window, so this widens the existing Skeleton's condition rather than
   * introducing a second loading UI. */
  contentLoading?: boolean
}) {
  // No reset-on-prop-change effect needed: this component's ancestor
  // (DesktopDetailCard / MobileDetailSheet) is always keyed by `park.id`
  // (see ParkDetailPanel below), so a new selection remounts this
  // component fresh — `loaded` naturally starts at `false` again.
  const [loaded, setLoaded] = useState(false)

  if (!contentLoading && !image) return null

  const showSkeleton = contentLoading || !loaded
  const handleImageSettled = () => setLoaded(true)

  return (
    <div
      data-testid="detail-photo-wrapper"
      className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[var(--color-surface-sunken)]"
    >
      {showSkeleton && (
        <>
          <Skeleton
            data-testid="detail-photo-skeleton"
            aria-hidden="true"
            className="absolute inset-0 h-full w-full rounded-none"
          />
          <span role="status" className="sr-only">
            {contentLoading ? 'Loading park details…' : 'Loading photo…'}
          </span>
        </>
      )}
      {!contentLoading && image && (
        <img
          data-testid="detail-photo"
          src={image.url}
          alt={image.altText || image.caption || image.title || `${parkName} photograph`}
          className={cn('h-full w-full object-cover transition-opacity', loaded ? 'opacity-100' : 'opacity-0')}
          onLoad={handleImageSettled}
          onError={handleImageSettled}
        />
      )}
    </div>
  )
}

function ParkDescription({ content }: { content: NpsParkContent | undefined }) {
  if (!content) {
    return (
      <p data-testid="detail-description-unavailable" className="text-sm text-muted-foreground">
        Description not available yet for this park.
      </p>
    )
  }

  return (
    <p data-testid="detail-description" className="text-sm leading-relaxed text-foreground">
      {content.description}
    </p>
  )
}

/** Drive cost from Fort Collins — raw hours via the matrix, drive DAYS exclusively via
 * fe-03's `driveDays()` (never recomputed inline). Not-drivable parks show their cited
 * reason instead (no drive-day affordance). */
function DriveStats({ park }: { park: Park }) {
  if (!park.drivable) {
    return (
      <p data-testid="detail-not-drivable-reason" className="text-sm text-muted-foreground">
        {park.notDrivableReason}
      </p>
    )
  }

  const hours = driveMatrix.hours[FOCO_ID]?.[park.id]

  if (hours === undefined) {
    // Defensive empty state: a drivable park missing from the matrix
    // should never happen (be-04 routes every drivable destination), but
    // the UI must still degrade gracefully rather than show a broken figure.
    return (
      <p data-testid="detail-drive-unavailable" className="text-sm text-muted-foreground">
        Drive time unavailable.
      </p>
    )
  }

  const days = driveDays(hours)

  return (
    <p data-testid="detail-drive-stats" className="text-sm text-foreground">
      <span data-testid="detail-drive-hours" className="font-mono tabular-nums">
        {hours.toFixed(1)}
      </span>
      {' h — '}
      <span data-testid="detail-drive-days" className="font-mono tabular-nums">
        {days}
      </span>
      {` driving ${days === 1 ? 'day' : 'days'}`}
    </p>
  )
}

/** Recommended stay length — consumes the fe-01 primitive exclusively (W3); never forked. */
function StayDots({ park, size = 'sm' }: { park: Park; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div data-testid="detail-stay-dots">
      <DayDotCluster count={park.recommendedStayDays} variant="stay" size={size} />
    </div>
  )
}

function ActivityBadges({ activities }: { activities: NpsParkContent['activities'] }) {
  if (activities.length === 0) return null

  return (
    <div data-testid="detail-activities" className="flex flex-wrap gap-[var(--space-2)]">
      {activities.slice(0, MAX_VISIBLE_ACTIVITIES).map((activity) => (
        <Badge key={activity.id} variant="outline">
          {activity.name}
        </Badge>
      ))}
    </div>
  )
}

/** Campground link-outs — NPS url + recreation.gov reservationUrl, link only (no booking). */
function CampgroundList({ campgrounds }: { campgrounds: NpsParkContent['campgrounds'] }) {
  if (campgrounds.length === 0) {
    return (
      <p data-testid="detail-campgrounds-empty" className="text-sm text-muted-foreground">
        No NPS campground listings for this park yet.
      </p>
    )
  }

  return (
    <ul data-testid="detail-campgrounds" className="flex flex-col gap-[var(--space-2)]">
      {campgrounds.map((campground) => (
        <li
          key={campground.id}
          className="flex flex-wrap items-center gap-[var(--space-2)] text-sm text-foreground"
        >
          <span className="font-medium">{campground.name}</span>
          <a
            data-testid="detail-campground-link"
            href={campground.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--color-primary)] underline-offset-2 hover:underline"
          >
            NPS page <ExternalLink aria-hidden="true" className="size-3.5" />
          </a>
          {campground.reservationUrl && (
            <a
              data-testid="detail-campground-reserve-link"
              href={campground.reservationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[var(--color-secondary)] underline-offset-2 hover:underline"
            >
              Reserve <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Right-docked floating card at >=md (DESIGN.md mobile-width behavior + Component Rules
 * "Floating info card" — Shadcn Card, --radius-lg, --elevation-3 active). Photo-first order:
 * photo precedes the description paragraph in DOM order per the Constitution's photo-primacy
 * rule. */
function DesktopDetailCard({
  park,
  content,
  contentLoading,
}: {
  park: Park
  content: NpsParkContent | undefined
  contentLoading: boolean
}) {
  const prefersReducedMotion = useReducedMotion() ?? false

  return (
    <motion.div
      data-testid="park-detail-card"
      className="pointer-events-auto absolute top-[var(--space-24)] right-[var(--space-24)] bottom-[var(--space-24)] z-20 w-[380px]"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
      transition={{ duration: prefersReducedMotion ? 0 : CARD_ENTER_DURATION_S, ease: CARD_CURVE }}
    >
      <Card className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] p-0 shadow-[var(--elevation-3)]">
        <ParkPhoto image={content?.images[0]} parkName={park.fullName} contentLoading={contentLoading} />
        <div className="flex-1 overflow-y-auto p-[var(--space-6)]">
          <div className="flex flex-col gap-[var(--space-4)]">
            <h2 data-testid="detail-headline" className={HEADLINE_CLASS}>
              {park.fullName}
            </h2>
            <ParkDescription content={content} />
            <DriveStats park={park} />
            <StayDots park={park} size="md" />
            <ActivityBadges activities={content?.activities ?? []} />
            <CampgroundList campgrounds={content?.campgrounds ?? []} />
          </div>
        </div>
      </Card>
    </motion.div>
  )
}

/** Bottom sheet below md (DESIGN.md mobile-width: peek → expand). Peek shows the header
 * (name + stay-day dots, per the fe-05 task packet) at all times; the full body (photo-first,
 * per the Constitution) mounts only once expanded. */
function MobileDetailSheet({
  park,
  content,
  contentLoading,
  onOpenChange,
}: {
  park: Park
  content: NpsParkContent | undefined
  contentLoading: boolean
  onOpenChange: (open: boolean) => void
}) {
  // No reset-on-selection effect needed: ParkDetailPanel keys this
  // component by `park.id`, so a new selection remounts it fresh —
  // `isExpanded` naturally starts at `false` (peek) again.
  const [isExpanded, setIsExpanded] = useState(false)
  const drawerModule = useDrawerModule()

  // One-time async gap (cached-after-first-use, see useDrawerModule above) before the
  // lazy-loaded vaul Drawer chunk resolves — "nothing yet" is the same treatment
  // ParkDetailPanel already gives "no park selected", not a new loading state.
  if (!drawerModule) return null

  const { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } = drawerModule

  return (
    <Drawer open onOpenChange={onOpenChange} modal={false}>
      {/* Peek → expand is driven by conditionally mounting the body below,
       * not vaul's `snapPoints` (mixing a pixel snap point with the
       * fractional "full" snap produced an incorrect transform that pushed
       * the sheet off-screen — see this task's ui_packet for the isolation
       * debugging that found this). The drawer instead sizes naturally to
       * whichever content is currently mounted, up to the shared
       * DrawerContent's own max-h-[80vh] cap; vaul still animates the
       * height change smoothly via its built-in ResizeObserver. */}
      <DrawerContent data-testid="detail-sheet" data-expanded={isExpanded}>
        <DrawerHeader className="gap-[var(--space-3)]">
          <DrawerTitle data-testid="detail-headline" className={HEADLINE_CLASS}>
            {park.fullName}
          </DrawerTitle>
          <DrawerDescription className="sr-only">Trip details for {park.fullName}</DrawerDescription>
          <StayDots park={park} size="sm" />
          {!isExpanded && (
            <button
              type="button"
              data-testid="detail-sheet-expand-toggle"
              onClick={() => setIsExpanded(true)}
              aria-label={`Show full details for ${park.fullName}`}
              className="flex items-center justify-center gap-1 self-center rounded-[var(--radius-full)] px-[var(--space-3)] py-[var(--space-1)] text-xs font-medium text-muted-foreground"
            >
              More details <ChevronUp aria-hidden="true" className="size-3.5" />
            </button>
          )}
        </DrawerHeader>
        {isExpanded && (
          <div className="flex-1 overflow-y-auto px-[var(--space-4)] pb-[var(--space-6)]">
            <ParkPhoto image={content?.images[0]} parkName={park.fullName} contentLoading={contentLoading} />
            <div className="flex flex-col gap-[var(--space-4)] pt-[var(--space-4)]">
              <ParkDescription content={content} />
              <DriveStats park={park} />
              <ActivityBadges activities={content?.activities ?? []} />
              <CampgroundList campgrounds={content?.campgrounds ?? []} />
              <button
                type="button"
                data-testid="detail-sheet-collapse-toggle"
                onClick={() => setIsExpanded(false)}
                aria-label="Collapse details"
                className="flex items-center justify-center gap-1 self-center text-xs font-medium text-muted-foreground"
              >
                Show less <ChevronDown aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}

export function ParkDetailPanel() {
  const selectedId = useOutboundStore((state) => state.selectedId)
  const setSelected = useOutboundStore((state) => state.setSelected)
  const isDesktop = useIsDesktopViewport()
  const park = selectedId ? PARKS_BY_ID.get(selectedId) : undefined
  const { content, loading: contentLoading } = useNpsContent(park?.parkCode)

  useParkDetailFlyTo(park)

  if (isDesktop) {
    return (
      <AnimatePresence>
        {park && (
          <DesktopDetailCard key={park.id} park={park} content={content} contentLoading={contentLoading} />
        )}
      </AnimatePresence>
    )
  }

  if (!park) return null

  return (
    <MobileDetailSheet
      key={park.id}
      park={park}
      content={content}
      contentLoading={contentLoading}
      onOpenChange={(open) => {
        if (!open) setSelected(null)
      }}
    />
  )
}
