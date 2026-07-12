# Task: outbound-p1-hero-morph

**Human request:** From the R-011 viewing pass — "the 'Where to next?' pop up still blocks the map
on initial exploration, even if it doesn't stay on screen. it can be big at first but it should
slide to the top of the screen and transform to a smaller rectangle shape."
**Agents spawned:** FE#10 (implement), AUD#16 (gate)
**Routing:** direct (ORC acting as PM — single-domain FE amendment to the closed p1-mvp sprint,
post-close human amendment precedent; commits ride branch outbound-p1-mvp under the seq-65 push opt-in)

## Design intent (human words are canonical)
- Initial render: hero may appear large/centered as today ("big at first" is acceptable).
- Once initial exploration begins, it must stop blocking the map: animate — SLIDE to the top of
  the screen and TRANSFORM into a smaller rectangle (compact bar/pill), remaining legible and
  token-driven.
- ORC interpretation of the trigger (FE may refine with rationale): the existing fly-in settle
  signal (`flytoSettled`) fires the morph; a first user map interaction (pointerdown/wheel on the
  canvas) fires it early if it happens sooner. Reduced-motion: no slide animation — render the
  compact top state directly (or switch without motion) per the DESIGN.md reduced-motion rule.
- Existing behavior preserved: hero hides entirely when a park is selected; compact bar likewise.

## Scope
- Files: src/components/map-canvas.tsx (hero block), e2e/map-shell.spec.ts (update/extend
  assertions for both states + the morph), agent log, ui_packet.
- Constraints: tokens only; motion/react layout animation; entry chunk stays < 1 MB non-maplibre
  (R3); suite green at --workers=1 both projects (R1 mobile-chrome); no git operations.

## Success criteria
1. On load, hero renders; after fly-in settles (or first map interaction, whichever first) it
   slides to top and morphs to a compact rectangle — DOM-asserted in map-shell.spec.ts (both
   states + post-morph map interactivity at the formerly-blocked center region).
2. Reduced-motion path renders/settles to the compact top state without the slide animation.
3. Park selection still removes hero/bar; deselection returns the COMPACT bar (not the big card).
4. Full suite green at --workers=1 both projects; build/typecheck/lint/vitest green; chunk gate held.
