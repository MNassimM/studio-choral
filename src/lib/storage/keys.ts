import type { AudioType } from "@/types/domain";

/**
 * Construction des clés d'objets, en fonctions pures et testables.
 *
 * @remarks
 * Module neutre exprès, ni server-only ni use client : il ne touche à aucun
 * secret et ses tests tournent sous node --test.
 */

/** Préfixe des fichiers téléversés mais pas encore enregistrés. */
export const PENDING_PREFIX = "pending";

/** Préfixe des fichiers définitifs. */
export const WORKS_PREFIX = "works";

/** Taille maximale acceptée pour un téléversement, en octets. */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

/** Extensions de fichier audio acceptées. */
export const ALLOWED_EXTENSIONS = ["wav", "mp3", "flac"] as const;

/** Une extension acceptée. */
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

/**
 * Ce qui identifie une piste, et donc sa clé définitive.
 */
export type TrackLocation = {
  /** Identifiant de base de l'oeuvre, jamais son slug. */
  workId: string;
  /** Identifiant de base du mouvement, jamais son slug. */
  movementId: string;
  type: AudioType;
  /** Code du pupitre, nul pour un tutti ou un accompagnement. */
  voiceCode: string | null;
  extension: AllowedExtension;
};

/**
 * Nettoie un morceau de nom de fichier pour qu'il tienne dans une clé.
 *
 * @param value - Texte d'origine, éventuellement accentué.
 * @returns Un texte en minuscules, sans accent ni caractère douteux.
 */
export function sanitizeSegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);
}

/**
 * Extrait l'extension d'un nom de fichier, si elle est acceptée.
 *
 * @param filename - Nom du fichier d'origine.
 * @returns L'extension en minuscules, ou null si elle n'est pas acceptée.
 */
export function extensionOf(filename: string): AllowedExtension | null {
  const point = filename.lastIndexOf(".");
  if (point === -1 || point === filename.length - 1) return null;
  const extension = filename.slice(point + 1).toLowerCase();
  return ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)
    ? (extension as AllowedExtension)
    : null;
}

/**
 * Construit la clé d'un fichier tout juste téléversé.
 *
 * @param uploadId - Identifiant unique de ce téléversement.
 * @param filename - Nom du fichier d'origine, conservé pour la lisibilité.
 * @returns La clé sous le préfixe pending.
 */
export function buildPendingKey(uploadId: string, filename: string): string {
  const propre = sanitizeSegment(filename) || "fichier";
  return `${PENDING_PREFIX}/${sanitizeSegment(uploadId)}/${propre}`;
}

/**
 * Construit la clé définitive d'une piste.
 *
 * @param location - L'oeuvre, le mouvement, le type et le pupitre.
 * @returns La clé définitive.
 */
export function buildTrackKey(location: TrackLocation): string {
  const { workId, movementId, type, voiceCode, extension } = location;
  const voix = voiceCode ? sanitizeSegment(voiceCode) : "tutti";
  return [
    WORKS_PREFIX,
    sanitizeSegment(workId),
    "movements",
    sanitizeSegment(movementId),
    type,
    `${voix}.${extension}`,
  ].join("/");
}

/**
 * Dit si une clé est bien sous le préfixe des fichiers en attente.
 *
 * @param key - Clé à examiner.
 * @returns Vrai si la clé est un fichier en attente.
 */
export function isPendingKey(key: string): boolean {
  return key.startsWith(`${PENDING_PREFIX}/`);
}

/**
 * Vérifie qu'une clé est utilisable, sans remontée de chemin ni séparateur
 * vide.
 *
 * @param key - Clé à valider.
 * @returns Vrai si la clé est acceptable.
 */
export function isValidKey(key: string): boolean {
  if (key.length === 0 || key.length > 1024) return false;
  if (key.startsWith("/") || key.endsWith("/")) return false;
  if (key.includes("//")) return false;
  return key.split("/").every((part) => part !== "." && part !== "..");
}

/**
 * Fabrique un nom de fichier lisible pour un téléchargement.
 *
 * @param workTitle - Titre de l'oeuvre.
 * @param movementTitle - Titre du mouvement.
 * @param voiceLabel - Libellé du pupitre, ou null pour un tutti.
 * @param extension - Extension du fichier.
 * @returns Le nom proposé au visiteur.
 */
export function buildDownloadFilename(
  workTitle: string,
  movementTitle: string,
  voiceLabel: string | null,
  extension: string,
): string {
  const parts = [workTitle, movementTitle, voiceLabel ?? "tutti"]
    .map((part) => sanitizeSegment(part))
    .filter((part) => part.length > 0);
  return `${parts.join("-") || "piste"}.${extension}`;
}
