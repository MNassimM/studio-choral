import "server-only";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { r2Endpoint, storageEnv } from "@/server/storage/env";
import { isValidKey, MAX_UPLOAD_BYTES } from "@/server/storage/keys";
import {
  DOWNLOAD_URL_TTL_SECONDS,
  UPLOAD_URL_TTL_SECONDS,
} from "@/server/storage/ttl";
import type {
  DownloadRequest,
  MoveOutcome,
  ObjectInfo,
  ObjectStorage,
  SignedUrl,
  StorageResult,
  UploadRequest,
} from "@/server/storage/types";

/**
 * R2 se pilote par l'API compatible S3, sur une région fixe.
 */
const client = new S3Client({
  region: "auto",
  endpoint: r2Endpoint(),
  credentials: {
    accessKeyId: storageEnv.R2_ACCESS_KEY_ID,
    secretAccessKey: storageEnv.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Résume une erreur sans jamais laisser filtrer un secret.
 *
 * @param cause - L'erreur remontée.
 * @returns Une description courte et sûre.
 */
function describe(cause: unknown): string {
  if (cause instanceof Error) {
    return `${cause.name} : ${cause.message.split("?")[0]}`;
  }
  return String(cause).split("?")[0];
}

/** Calcule la date d'expiration d'une URL signée. */
function expiryFrom(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}

/**
 * Encode un nom de fichier pour l'en tête Content-Disposition.
 *
 * @param filename - Nom lisible proposé au visiteur.
 * @returns La valeur complète de l'en tête.
 */
function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * Fabrique un stockage adossé à un bucket R2 donné.
 *
 * @remarks
 * Le bucket est un paramètre et non une constante de module, parce que le
 * projet en utilise deux : un privé pour l'audio, servi par URL signée après
 * vérification des droits, et un public pour les couvertures. Les deux
 * partagent le même client et les mêmes identifiants, seule la destination
 * change.
 *
 * @param Bucket - Nom du bucket visé.
 * @param name - Nom du stockage, pour les journaux de démarrage seulement.
 * @returns Un stockage conforme au contrat ObjectStorage.
 */
function createR2Storage(Bucket: string, name: string): ObjectStorage {
  return {
    name,

    async signUpload({
      key,
      contentType,
      contentLength,
    }: UploadRequest): Promise<StorageResult<SignedUrl>> {
      if (!isValidKey(key)) {
        return { ok: false, error: `Clé de stockage invalide : ${key}` };
      }
      if (contentLength <= 0 || contentLength > MAX_UPLOAD_BYTES) {
        return {
          ok: false,
          error: `Taille refusée : ${contentLength} octets, la limite est ${MAX_UPLOAD_BYTES}.`,
        };
      }

      try {
        const url = await getSignedUrl(
          client,
          new PutObjectCommand({
            Bucket,
            Key: key,
            ContentType: contentType,
            ContentLength: contentLength,
          }),
          { expiresIn: UPLOAD_URL_TTL_SECONDS },
        );
        return { ok: true, url, expiresAt: expiryFrom(UPLOAD_URL_TTL_SECONDS) };
      } catch (cause) {
        return {
          ok: false,
          error: `Signature de téléversement impossible : ${describe(cause)}`,
        };
      }
    },

    async signDownload({
      key,
      downloadAs,
    }: DownloadRequest): Promise<StorageResult<SignedUrl>> {
      if (!isValidKey(key)) {
        return { ok: false, error: `Clé de stockage invalide : ${key}` };
      }

      try {
        const url = await getSignedUrl(
          client,
          new GetObjectCommand({
            Bucket,
            Key: key,
            // Sans ce paramètre le navigateur lit le fichier en place, ce que veut le bouton d'écoute. Avec, il déclenche un téléchargement.
            ...(downloadAs
              ? { ResponseContentDisposition: contentDisposition(downloadAs) }
              : {}),
          }),
          { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
        );
        return {
          ok: true,
          url,
          expiresAt: expiryFrom(DOWNLOAD_URL_TTL_SECONDS),
        };
      } catch (cause) {
        return {
          ok: false,
          error: `Signature de lecture impossible : ${describe(cause)}`,
        };
      }
    },

    async moveObject(
      from: string,
      to: string,
    ): Promise<StorageResult<MoveOutcome>> {
      if (!isValidKey(from) || !isValidKey(to)) {
        return { ok: false, error: "Clé de stockage invalide au déplacement." };
      }
      if (from === to) {
        return { ok: true, key: to, sourceLeftBehind: false };
      }

      try {
        await client.send(
          new CopyObjectCommand({
            Bucket,
            // CopySource attend bucket puis clé, la clé devant être encodée.
            CopySource: `${Bucket}/${encodeURIComponent(from).replace(/%2F/g, "/")}`,
            Key: to,
          }),
        );
      } catch (cause) {
        return { ok: false, error: `Copie impossible : ${describe(cause)}` };
      }

      try {
        await client.send(new DeleteObjectCommand({ Bucket, Key: from }));
      } catch {
        // La copie a réussi, l'objet est bien à destination.
        return { ok: true, key: to, sourceLeftBehind: true };
      }

      return { ok: true, key: to, sourceLeftBehind: false };
    },

    async deleteObject(key: string): Promise<StorageResult> {
      if (!isValidKey(key)) {
        return { ok: false, error: `Clé de stockage invalide : ${key}` };
      }
      try {
        await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
        return { ok: true };
      } catch (cause) {
        return {
          ok: false,
          error: `Suppression impossible : ${describe(cause)}`,
        };
      }
    },

    async headObject(key: string): Promise<StorageResult<ObjectInfo>> {
      if (!isValidKey(key)) {
        return { ok: false, error: `Clé de stockage invalide : ${key}` };
      }
      try {
        const reponse = await client.send(
          new HeadObjectCommand({ Bucket, Key: key }),
        );
        return {
          ok: true,
          size: reponse.ContentLength ?? 0,
          contentType: reponse.ContentType ?? null,
        };
      } catch (cause) {
        return { ok: false, error: `Objet introuvable : ${describe(cause)}` };
      }
    },
  };
}

/**
 * Le stockage privé : les fichiers audio, jamais lisibles sans URL signée.
 */
export const r2Storage: ObjectStorage = createR2Storage(
  storageEnv.R2_BUCKET,
  "r2",
);

/**
 * Le stockage public : les images de couverture, et rien d'autre.
 *
 * @remarks
 * Aucun appel de ce projet ne signe une lecture sur ce bucket : ses objets
 * sont servis directement par leur URL publique. Seules l'écriture et la
 * suppression y transitent.
 */
export const r2PublicStorage: ObjectStorage = createR2Storage(
  storageEnv.R2_PUBLIC_BUCKET,
  "r2-public",
);
