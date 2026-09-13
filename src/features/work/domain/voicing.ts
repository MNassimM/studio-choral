import { z } from "zod";

/**
 * Formation vocale d'une oeuvre (Work.voicing).
 */

/**
 * Formations les plus courantes, à proposer dans une future interface d'admin.
 *
 * @remarks
 * Ce sont des suggestions, pas une contrainte. Toute autre chaîne reste acceptée par voicingSchema.
 */
export const COMMON_VOICINGS = [
  "SATB",
  "SATB div.",
  "SAB",
  "SSA",
  "SSAA",
  "TTBB",
  "TB",
  "unisson",
] as const;

/**
 * Schéma de validation d'une formation vocale.
 */
export const voicingSchema = z.string().trim().min(1).max(40);
