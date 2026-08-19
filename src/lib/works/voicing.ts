/**
 * La formation vocale (`Work.voicing`) est une chaîne libre, pas un enum :
 * les formations réelles sont trop variées (SATB, SSA, TTBB, SSAA,
 * « SATB div. », « SATB + soli », « SAB »...) pour une liste fermée, qui
 * imposerait une migration à chaque nouvelle formation rencontrée.
 *
 * Elle est saisie à la main, œuvre par œuvre — jamais déduite des AudioFile
 * en base : une œuvre peut comporter des divisions ponctuelles (un pupitre
 * divisé sur un seul passage) tout en restant désignée par son effectif
 * d'usage. Aucune fonction de ce module ne calcule ni ne vérifie le voicing
 * à partir des voix présentes en base.
 */

import { z } from "zod";

/**
 * Suggestions pour une future interface d'admin — pas une contrainte : toute
 * autre chaîne reste acceptée par `voicingSchema`.
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

export const voicingSchema = z.string().trim().min(1).max(40);
