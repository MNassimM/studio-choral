import {
  ALLOWED_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  extensionOf,
  type AllowedExtension,
} from "@/lib/storage/keys";
import { PER_VOICE_TYPES } from "@/lib/admin/sellability/track-coverage";
import type { AudioType } from "@/types/domain";

/**
 * Règles de validation d'un dépôt audio, en fonctions pures et testables.
 */

/** Durée maximale acceptée pour une piste, en secondes. */
export const MAX_DURATION_SECONDS = 2 * 60 * 60;

/** Types MIME acceptés, par extension. */
export const MIME_BY_EXTENSION: Record<AllowedExtension, string[]> = {
  wav: ["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"],
  mp3: ["audio/mpeg", "audio/mp3"],
  flac: ["audio/flac", "audio/x-flac"],
};

/**
 * Les types de piste qui portent un pupitre.
 */
export { PER_VOICE_TYPES } from "@/lib/admin/sellability/track-coverage";

/**
 * Dit si un type de piste exige un pupitre.
 *
 * @param type - Type de la piste.
 * @returns Vrai pour les types par pupitre, faux pour tutti et accompagnement.
 */
export function requiresVoice(type: AudioType): boolean {
  return PER_VOICE_TYPES.includes(type);
}

/**
 * Identifie une case de la matrice, pour repérer les doublons.
 *
 * @param movementKey - Clé du mouvement, celle du brouillon.
 * @param voiceCode - Code du pupitre, nul pour un tutti.
 * @param type - Type de la piste.
 * @returns Une clé de comparaison.
 */
export function trackCellKey(
  movementKey: string,
  voiceCode: string | null,
  type: AudioType,
): string {
  return `${movementKey}|${voiceCode ?? ""}|${type}`;
}

/**
 * Ce qu'un dépôt annonce avant d'obtenir son URL.
 */
export type UploadCandidate = {
  filename: string;
  contentType: string;
  sizeBytes: number;
  durationSeconds: number;
};

/**
 * Ce que la validation renvoie.
 */
export type UploadValidation =
  { ok: true; extension: AllowedExtension } | { ok: false; error: string };

/**
 * Vérifie qu'un fichier peut être téléversé.
 *
 * @param candidate - Ce que le navigateur annonce du fichier.
 * @returns L'extension retenue, ou la raison du refus.
 */
export function validateUpload(candidate: UploadCandidate): UploadValidation {
  const { filename, contentType, sizeBytes, durationSeconds } = candidate;

  const extension = extensionOf(filename);
  if (extension === null) {
    return {
      ok: false,
      error: `Format non accepté. Formats possibles : ${ALLOWED_EXTENSIONS.join(", ")}.`,
    };
  }

  const attendus = MIME_BY_EXTENSION[extension];
  if (!attendus.includes(contentType.toLowerCase())) {
    return {
      ok: false,
      error: `Le type ${contentType} ne correspond pas à un fichier ${extension}.`,
    };
  }

  if (!Number.isInteger(sizeBytes) || sizeBytes <= 0) {
    return { ok: false, error: "La taille du fichier est illisible." };
  }
  if (sizeBytes > MAX_UPLOAD_BYTES) {
    const mo = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
    return {
      ok: false,
      error: `Fichier trop volumineux, la limite est ${mo} Mo.`,
    };
  }

  if (!Number.isInteger(durationSeconds) || durationSeconds <= 0) {
    return { ok: false, error: "La durée de la piste est illisible." };
  }
  if (durationSeconds > MAX_DURATION_SECONDS) {
    return {
      ok: false,
      error: "Cette piste dépasse la durée maximale admise.",
    };
  }

  return { ok: true, extension };
}

/**
 * Tire un identifiant de téléversement, qui compose la clé sous pending.
 *
 * @returns Un identifiant unique.
 */
export function newUploadId(): string {
  return crypto.randomUUID();
}
