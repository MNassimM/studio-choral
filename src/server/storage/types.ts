import "server-only";

/**
 * Contrat public du module de stockage.
 */

/**
 * Résultat d'une opération de stockage, en succès ou en échec.
 */
export type StorageResult<T = Record<never, never>> =
  ({ ok: true } & T) | { ok: false; error: string };

/**
 * Une URL signée, avec le moment où elle cesse d'être valable.
 */
export type SignedUrl = {
  url: string;
  /** Instant d'expiration, utile pour décider d'en redemander une. */
  expiresAt: Date;
};

/**
 * Ce qu'il faut pour signer un téléversement.
 */
export type UploadRequest = {
  /** Clé de destination, sous le préfixe pending. */
  key: string;
  /** Type de contenu que le navigateur enverra, vérifié à la signature. */
  contentType: string;
  /** Taille annoncée en octets, refusée au delà de la limite du module. */
  contentLength: number;
};

/**
 * Ce qu'il faut pour signer une lecture.
 */
export type DownloadRequest = {
  key: string;
  /**
   * Nom de fichier proposé au visiteur. Quand il est présent, la réponse
   * force le téléchargement au lieu d'une lecture dans le navigateur.
   */
  downloadAs?: string;
};

/**
 * Le contrat que remplit le stockage.
 */
export type ObjectStorage = {
  /** Nom du fournisseur, pour les journaux de démarrage seulement. */
  readonly name: string;

  /**
   * Signe un téléversement direct depuis le navigateur.
   *
   * @param request - Clé de destination, type et taille du contenu.
   * @returns L'URL à laquelle envoyer la requête PUT.
   */
  signUpload(request: UploadRequest): Promise<StorageResult<SignedUrl>>;

  /**
   * Signe une lecture, en flux ou en téléchargement.
   *
   * @param request - Clé à lire, et nom de fichier si l'on force le
   * téléchargement.
   * @returns L'URL de lecture.
   */
  signDownload(request: DownloadRequest): Promise<StorageResult<SignedUrl>>;

  /**
   * Déplace un objet d'une clé vers une autre, par copie puis suppression.
   *
   * @param from - Clé source, en général sous pending.
   * @param to - Clé définitive.
   * @returns Le résultat, avec la trace d'une source restée en place.
   */
  moveObject(from: string, to: string): Promise<StorageResult<MoveOutcome>>;

  /**
   * Supprime un objet.
   *
   * @param key - Clé à supprimer.
   * @returns Le résultat de la suppression.
   */
  deleteObject(key: string): Promise<StorageResult>;

  /**
   * Dit si un objet existe, sans le télécharger.
   *
   * @param key - Clé à sonder.
   * @returns La taille et le type de l'objet, ou un échec s'il est absent.
   */
  headObject(key: string): Promise<StorageResult<ObjectInfo>>;
};

/**
 * Ce que l'on sait d'un objet sans le lire.
 */
export type ObjectInfo = {
  size: number;
  contentType: string | null;
};

/**
 * Ce qu'a donné un déplacement.
 */
export type MoveOutcome = {
  key: string;
  /**
   * Vrai quand la copie a réussi mais que la source n'a pas pu être
   * supprimée. L'objet est bien à destination, une copie traîne à la source.
   */
  sourceLeftBehind: boolean;
};
