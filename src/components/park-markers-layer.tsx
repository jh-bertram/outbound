import { Marker } from '@vis.gl/react-maplibre'
import { RouteOff } from 'lucide-react'
import { parks, type Park } from '@/data/parks'
import { useOutboundStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/**
 * Slot: park marker DOM overlays for all 63 destinations (drivable +
 * not-drivable, distinct states — BRIEF §7.1). Owner: outbound-p1-fe-04.
 *
 * Created null by the composition root (outbound-p1-fe-02a); implemented
 * here in isolation, without touching App.tsx / map-canvas.tsx / store.ts.
 *
 * One `<Marker>` per destination `id` (B1) — Sequoia (`id: "seki"`) and
 * Kings Canyon (`id: "seki-kica"`) render as TWO distinct markers at their
 * own `routingCoord`s, even though both join the same NPS `parkCode`.
 *
 * Clicking ANY marker (drivable or not) sets `selectedId` so fe-05's detail
 * panel can show info for it — not-drivable destinations are excluded from
 * routing/"add to trip" (a later task's concern), not from selection here.
 */

// DESIGN.md: "Minimum touch target 44×44px for every interactive element,
// including a map marker's tappable hit-area (the visual marker may render
// smaller; the hit-area padding must still reach 44px on touch devices)."
// Tailwind's `size-11` spacing-scale step = 2.75rem = 44px exactly — no raw
// pixel literal needed in source.
const MARKER_HIT_AREA_CLASS = 'size-11'

// DESIGN.md's Park Marker table names `signpost-off` as an *example*
// ("e.g.") not-drivable glyph. That icon does not exist in the installed
// lucide-react@1.24 icon set (verified against node_modules this session).
// `RouteOff` is confirmed exported and is at least as semantically precise
// for "not routable by road" — a documented substitution of the example
// icon name, not a change to any DESIGN.md token value.
const NOT_DRIVABLE_GLYPH_SIZE_CLASS = 'size-2.5'

function markerAriaLabel(park: Park): string {
  if (park.drivable) return park.fullName
  return `${park.fullName} — not reachable by road (${park.notDrivableReason})`
}

function ParkMarkerButton({ park }: { park: Park }) {
  const isSelected = useOutboundStore((state) => state.selectedId === park.id)
  const setSelected = useOutboundStore((state) => state.setSelected)
  const setHovered = useOutboundStore((state) => state.setHovered)

  // DESIGN.md's marker-state table doesn't address a "selected AND
  // not-drivable" combination explicitly. To honor the WCAG 1.4.1 rule
  // ("never color alone") at every moment, the not-drivable fill + ring +
  // glyph are held constant regardless of selection; only the shared
  // `--marker-size-*` grow reflects selection for every marker, drivable
  // or not — an additive extension, not a silent DESIGN.md value change.
  const sizeClass = isSelected
    ? 'size-[var(--marker-size-selected)]'
    : 'size-[var(--marker-size-default)]'

  const fillClass = !park.drivable
    ? 'bg-[var(--marker-color-not-drivable)]'
    : isSelected
      ? 'bg-[var(--marker-color-selected)]'
      : cn(
          'bg-[var(--marker-color-drivable)]',
          'group-hover:bg-[var(--marker-color-drivable-hover)]',
          'group-focus-visible:bg-[var(--marker-color-drivable-hover)]',
        )

  const ringClass = !park.drivable
    ? '[box-shadow:0_0_0_var(--marker-stroke-not-drivable-width)_var(--marker-stroke-not-drivable-color)]'
    : isSelected
      ? '[box-shadow:0_0_0_var(--marker-stroke-selected-width)_var(--marker-stroke-selected-color)]'
      : '[box-shadow:0_0_0_var(--marker-stroke-default-width)_var(--marker-stroke-default-color)]'

  const hoverScaleClass =
    park.drivable && !isSelected
      ? 'group-hover:[transform:scale(1.08)] group-focus-visible:[transform:scale(1.08)] transition-transform duration-150'
      : ''

  return (
    <button
      type="button"
      data-testid="park-marker"
      data-park-id={park.id}
      data-drivable={park.drivable}
      aria-label={markerAriaLabel(park)}
      aria-current={isSelected ? 'true' : undefined}
      onClick={() => setSelected(park.id)}
      onMouseEnter={() => setHovered(park.id)}
      onMouseLeave={() => setHovered(null)}
      onFocus={() => setHovered(park.id)}
      onBlur={() => setHovered(null)}
      className={cn(
        MARKER_HIT_AREA_CLASS,
        'group flex items-center justify-center rounded-full',
        '[outline-style:none]',
        'focus-visible:[outline-style:solid]',
        'focus-visible:[outline-width:var(--marker-focus-ring-width)]',
        'focus-visible:[outline-color:var(--marker-focus-ring-color)]',
        'focus-visible:[outline-offset:var(--marker-focus-ring-offset)]',
        park.drivable ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      <span
        aria-hidden="true"
        data-testid="marker-dot"
        className={cn(
          'flex items-center justify-center rounded-full',
          sizeClass,
          fillClass,
          ringClass,
          hoverScaleClass,
        )}
      >
        {!park.drivable && (
          <RouteOff
            data-testid="marker-not-drivable-glyph"
            aria-hidden="true"
            className={cn(NOT_DRIVABLE_GLYPH_SIZE_CLASS, 'text-[var(--color-text-inverse)]')}
          />
        )}
      </span>
    </button>
  )
}

export function ParkMarkersLayer() {
  return (
    <>
      {parks.map((park) => (
        <Marker key={park.id} longitude={park.routingCoord.lng} latitude={park.routingCoord.lat}>
          <ParkMarkerButton park={park} />
        </Marker>
      ))}
    </>
  )
}
