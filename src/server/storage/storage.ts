import "server-only";

import { r2PublicStorage, r2Storage } from "@/server/storage/r2-client";
import type { ObjectStorage } from "@/server/storage/types";

/**
 * Point d'entrée public du module de stockage.
 */

/**
 * Le stockage configuré pour ce projet : le bucket PRIVÉ.
 *
 * @remarks
 * Tout ce qui se vend vit ici, et rien n'en sort sans URL signée.
 */
export const storage: ObjectStorage = r2Storage;

/**
 * Le stockage des images de couverture : le bucket PUBLIC.
 *
 * @remarks
 * Volontairement distinct de `storage`, pour qu'une clé de couverture ne
 * puisse jamais désigner un fichier payant, ni l'inverse.
 */
export const coverStorage: ObjectStorage = r2PublicStorage;

export { coverUrl } from "@/server/storage/cover-url";

export {
  ALLOWED_EXTENSIONS,
  COVER_EXTENSIONS,
  COVER_SEGMENT,
  MAX_COVER_BYTES,
  MAX_UPLOAD_BYTES,
  PENDING_PREFIX,
  WORKS_PREFIX,
  buildDownloadFilename,
  buildCoverKey,
  buildPendingKey,
  buildTrackKey,
  coverExtensionOf,
  downloadPartLabel,
  extensionOf,
  isCoverKey,
  isPendingKey,
  isValidKey,
  sanitizeSegment,
  type AllowedExtension,
  type CoverExtension,
  type CoverLocation,
  type TrackLocation,
} from "@/server/storage/keys";

export {
  DOWNLOAD_URL_TTL_SECONDS,
  UPLOAD_URL_TTL_SECONDS,
} from "@/server/storage/ttl";

export type {
  DownloadRequest,
  MoveOutcome,
  ObjectInfo,
  ObjectStorage,
  SignedUrl,
  StorageResult,
  UploadRequest,
} from "@/server/storage/types";
