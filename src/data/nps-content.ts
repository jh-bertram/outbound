import rawNpsContent from "./nps-content.json" with { type: "json" };
import { NpsContentSchema, type NpsContent } from "./nps-content-schema.ts";

export { NpsContentSchema, NpsParkContentSchema, type NpsContent, type NpsParkContent } from "./nps-content-schema.ts";

/**
 * Parsed + validated NPS content map. Throws at module load if nps-content.json
 * violates the schema (see nps-content-schema.ts for the schema + its provenance).
 */
export const npsContent: NpsContent = NpsContentSchema.parse(rawNpsContent);
