import "server-only";

import { r2Storage } from "@/lib/storage/r2-client";
import type { ObjectStorage } from "@/lib/storage/types";

/**
 * Point d'entrée public du module de stockage.
 */

/**
 * Le stockage configuré pour ce projet.
 */
export const storage: ObjectStorage = r2Storage;

export {
  ALLOWED_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  PENDING_PREFIX,
  WORKS_PREFIX,
  buildDownloadFilename,
  buildPendingKey,
  buildTrackKey,
  downloadPartLabel,
  extensionOf,
  isPendingKey,
  isValidKey,
  sanitizeSegment,
  type AllowedExtension,
  type TrackLocation,
} from "@/lib/storage/keys";

export {
  DOWNLOAD_URL_TTL_SECONDS,
  UPLOAD_URL_TTL_SECONDS,
} from "@/lib/storage/ttl";

export type {
  DownloadRequest,
  MoveOutcome,
  ObjectInfo,
  ObjectStorage,
  SignedUrl,
  StorageResult,
  UploadRequest,
} from "@/lib/storage/types";
