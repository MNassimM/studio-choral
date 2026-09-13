/**
 * Règles d'une image de couverture : formats et taille acceptés.
 *
 * @remarks
 * Hors de server/ : le formulaire d'administration les affiche dans le
 * navigateur, et la validation serveur les applique.
 */

/** Extensions d'image acceptées pour une couverture. */
export const COVER_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

/** Une extension d'image acceptée. */
export type CoverExtension = (typeof COVER_EXTENSIONS)[number];

/** Taille maximale d'une couverture, en octets. */
export const MAX_COVER_BYTES = 5 * 1024 * 1024;
