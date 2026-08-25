import { z } from "zod";

/**
 * Formation vocale d'une œuvre (Work.voicing).
 *
 * @remarks
 * C'est une chaîne libre, pas un enum. Les formations réelles sont trop
 * variées pour une liste fermée : SATB, SSA, TTBB, SSAA, « SATB div. »,
 * « SATB + soli », SAB, et ainsi de suite. Un enum imposerait une migration à
 * chaque nouvelle formation rencontrée dans le répertoire.
 *
 * La valeur est saisie à la main, œuvre par œuvre, et n'est JAMAIS déduite
 * des AudioFile en base. Une œuvre peut comporter une division ponctuelle sur
 * un seul passage tout en restant désignée par son effectif d'usage. Aucune
 * fonction de ce module ne calcule ni ne vérifie le voicing à partir des voix
 * réellement présentes.
 */

/**
 * Formations les plus courantes, à proposer dans une future interface d'admin.
 *
 * @remarks
 * Ce sont des suggestions, pas une contrainte. Toute autre chaîne reste
 * acceptée par voicingSchema.
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
 *
 * @remarks
 * Le seul garde fou est la longueur : au moins un caractère après nettoyage
 * des espaces, et pas plus de quarante. Assez large pour « SATB + soli »,
 * assez serré pour écarter une saisie manifestement erronée.
 */
export const voicingSchema = z.string().trim().min(1).max(40);
