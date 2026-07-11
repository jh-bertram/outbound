import { z } from 'zod'
import rawDriveMatrix from './drive-matrix.json' with { type: 'json' }

/**
 * Zod schema for the precomputed drive-time matrix (see scripts/build-drive-matrix.ts
 * for how src/data/drive-matrix.json + this schema's contract are generated).
 *
 * Nodes are keyed by destination `id` (B1 — NOT `parkCode`): Sequoia (`id: "seki"`)
 * and Kings Canyon (`id: "seki-kica"`) are DISTINCT nodes with distinct Fort-Collins
 * hours, plus the literal `"FOCO"` node for Fort Collins (src/data/constants.ts).
 * Not-drivable destinations never appear as nodes here.
 *
 * `hours` stores RAW HOURS — the UI derives drive-days via
 * `Math.ceil(hours / 10)` (src/lib/trip-math.ts), never stored here.
 */
export const DriveMatrixSchema = z
  .object({
    generatedAt: z.string().min(1),
    method: z.enum(['osrm-demo', 'estimated']),
    nodes: z.array(z.string().min(1)).min(1),
    hours: z.record(z.string(), z.record(z.string(), z.number().nonnegative())),
  })
  .refine((m) => m.nodes.includes('FOCO'), {
    message: 'nodes must include the "FOCO" (Fort Collins) origin',
  })
  .refine((m) => m.nodes.length === Object.keys(m.hours).length, {
    message: 'hours must have exactly one row per node',
  })

export type DriveMatrix = z.infer<typeof DriveMatrixSchema>

/**
 * Parsed + validated drive-time matrix. Throws at module load if drive-matrix.json
 * violates the schema.
 */
export const driveMatrix: DriveMatrix = DriveMatrixSchema.parse(rawDriveMatrix)
