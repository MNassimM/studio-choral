import {
  COVER_EXTENSIONS,
  MAX_COVER_BYTES,
  type CoverExtension,
} from "@/domain/cover/cover-rules";
import { coverExtensionOf } from "@/server/storage/keys";

/**
 * Règles de validation d'un dépôt d'image de couverture, en fonctions pures
 * et testables.
 *
 * @remarks
 * Jumeau de features/admin/works/domain/audio-upload.ts, volontairement séparé : les deux
 * dépôts n'acceptent ni les mêmes formats, ni les mêmes tailles, et fusionner
 * leurs règles obligerait à paramétrer ce qui se lit aujourd'hui d'un coup
 * d'oeil.
 */

/** Types MIME acceptés, par extension. */
export const MIME_BY_COVER_EXTENSION: Record<CoverExtension, string[]> = {
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
};

/**
 * Ce qu'un dépôt d'image annonce avant d'obtenir son URL.
 */
export type CoverCandidate = {
  filename: string;
  contentType: string;
  sizeBytes: number;
};

/**
 * Ce que la validation renvoie.
 */
export type CoverValidation =
  { ok: true; extension: CoverExtension } | { ok: false; error: string };

/**
 * Vérifie qu'une image peut être téléversée.
 *
 * @remarks
 * Rien de ce que le navigateur annonce ne fait autorité : ces contrôles
 * servent à refuser tôt et à afficher un motif clair. Ce qui protège
 * réellement est la signature, qui fige le type et la taille côté R2.
 *
 * @param candidate - Ce que le navigateur annonce du fichier.
 * @returns L'extension retenue, ou la raison du refus.
 */
export function validateCover(candidate: CoverCandidate): CoverValidation {
  const { filename, contentType, sizeBytes } = candidate;

  const extension = coverExtensionOf(filename);
  if (extension === null) {
    return {
      ok: false,
      error: `Format non accepté. Formats possibles : ${COVER_EXTENSIONS.join(", ")}.`,
    };
  }

  const attendus = MIME_BY_COVER_EXTENSION[extension];
  if (!attendus.includes(contentType.toLowerCase())) {
    return {
      ok: false,
      error: `Le type ${contentType} ne correspond pas à une image ${extension}.`,
    };
  }

  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: "La taille du fichier est illisible." };
  }
  if (sizeBytes > MAX_COVER_BYTES) {
    const mo = Math.round(MAX_COVER_BYTES / (1024 * 1024));
    return {
      ok: false,
      error: `Image trop volumineuse, la limite est ${mo} Mo.`,
    };
  }

  return { ok: true, extension };
}
