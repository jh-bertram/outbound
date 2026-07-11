/**
 * Home-base coordinate for the Outbound trip planner. Every trip starts and ends here.
 * SINGLE SOURCE — do not re-embed this lat/lng literal anywhere else in the codebase
 * (be-04's drive-matrix origin and fe-06's route-start geometry import this constant).
 */
export const FORT_COLLINS = { lat: 40.5853, lng: -105.0844 } as const;
