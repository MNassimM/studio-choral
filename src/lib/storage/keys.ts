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
 * @param movementTitle - Titre du mouvement, ou null pour une oeuvre à
 * mouvement unique, dont le mouvement répéterait le plus souvent le titre.
 * @param partLabel - Ce que contient le fichier : un pupitre, « tutti » ou
 * « accompagnement ».
 * @param extension - Extension du fichier.
 * @returns Le nom proposé au visiteur.
 */
export function buildDownloadFilename(
  workTitle: string,
  movementTitle: string | null,
  partLabel: string,
  extension: string,
): string {
  const parts = [workTitle, movementTitle ?? "", partLabel]
    .map((part) => sanitizeSegment(part))
    .filter((part) => part.length > 0);
  return `${parts.join("-") || "piste"}.${extension}`;
}

/**
 * Dit ce que contient une piste, pour son nom de téléchargement.
 *
 * @param type - Type de la piste.
 * @param voiceCode - Code du pupitre, nul pour une piste commune.
 * @returns Le code du pupitre, « accompagnement » ou « tutti ».
 */
export function downloadPartLabel(
  type: string,
  voiceCode: string | null,
): string {
  if (voiceCode !== null) return voiceCode;
  return type === "ACCOMPANIMENT" ? "accompagnement" : "tutti";
}

/* ─── Images de couverture ────────────────────────────────────────────────
 * Elles vivent dans un bucket PUBLIC distinct, et non sous un préfixe du
 * bucket privé : R2 n'ouvre l'accès public que par bucket entier. Leur clé
 * est donc lisible par tout le monde, ce qui est sans conséquence puisque ce
 * bucket ne contient rien d'autre que des couvertures.
 * ─────────────────────────────────────────────────────────────────────── */

/** Segment qui isole les couvertures dans le bucket public. */
export const COVER_SEGMENT = "cover";

/** Extensions d'image acceptées pour une couverture. */
export const COVER_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

/** Une extension d'image acceptée. */
export type CoverExtension = (typeof COVER_EXTENSIONS)[number];

/** Taille maximale d'une couverture, en octets. */
export const MAX_COVER_BYTES = 5 * 1024 * 1024;

/**
 * Ce qui identifie une couverture, et donc sa clé définitive.
 */
export type CoverLocation = {
  /** Identifiant de base de l'oeuvre, jamais son slug. */
  workId: string;
  /**
   * Jeton qui change à chaque remplacement d'image.
   *
   * @remarks
   * C'est lui qui rend l'URL immuable : une image remplacée porte une
   * nouvelle clé, donc une nouvelle adresse, et le cache du navigateur comme
   * celui du réseau de diffusion n'ont jamais à être invalidés.
   */
  version: string;
  extension: CoverExtension;
};

/**
 * Extrait l'extension d'un nom d'image, si elle est acceptée.
 *
 * @param filename - Nom du fichier d'origine.
 * @returns L'extension en minuscules, ou null si elle n'est pas acceptée.
 */
export function coverExtensionOf(filename: string): CoverExtension | null {
  const point = filename.lastIndexOf(".");
  if (point === -1 || point === filename.length - 1) return null;
  const extension = filename.slice(point + 1).toLowerCase();
  return COVER_EXTENSIONS.includes(extension as CoverExtension)
    ? (extension as CoverExtension)
    : null;
}

/**
 * Construit la clé définitive d'une couverture.
 *
 * @param location - L'oeuvre, la version et l'extension.
 * @returns La clé définitive, dans le bucket public.
 */
export function buildCoverKey(location: CoverLocation): string {
  const { workId, version, extension } = location;
  return [
    WORKS_PREFIX,
    sanitizeSegment(workId),
    COVER_SEGMENT,
    `${sanitizeSegment(version)}.${extension}`,
  ].join("/");
}

/**
 * Dit si une clé désigne bien une couverture.
 *
 * @param key - Clé à examiner.
 * @returns Vrai si la clé a la forme d'une couverture rangée.
 */
export function isCoverKey(key: string): boolean {
  const parts = key.split("/");
  return (
    isValidKey(key) &&
    parts.length === 4 &&
    parts[0] === WORKS_PREFIX &&
    parts[2] === COVER_SEGMENT &&
    coverExtensionOf(parts[3]) !== null
  );
}

/**
 * Compose l'URL publique d'une couverture.
 *
 * @param baseUrl - Racine publique du bucket, sans barre finale.
 * @param key - Clé de la couverture.
 * @returns L'URL absolue à rendre dans une page.
 */
export function coverPublicUrl(baseUrl: string, key: string): string {
  return `${baseUrl}/${key}`;
}
