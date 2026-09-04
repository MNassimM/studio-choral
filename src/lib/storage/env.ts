import "server-only";

import { z } from "zod";

/**
 * Validation des variables d'environnement du stockage, exécutée au
 * chargement du module, comme src/lib/email/env.ts.
 */

const storageEnvSchema = z.object({
  /** Identifiant de compte Cloudflare */
  R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID est requise"),
  /** Identifiant du jeton d'API R2. */
  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID est requise"),
  /** Secret du jeton d'API R2, jamais journalisé. */
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY est requise"),
  /** Nom du bucket. */
  R2_BUCKET: z.string().min(1, "R2_BUCKET est requise"),
});

/**
 * Configuration validée du stockage.
 */
export type StorageEnv = z.infer<typeof storageEnvSchema>;

/**
 * Valide la configuration du stockage depuis l'environnement.
 *
 * @returns La configuration validée.
 * @throws {Error} Quand une variable manque ou est vide. Le message ne cite
 * que les NOMS des variables fautives, jamais leur valeur.
 */
function parseStorageEnv(): StorageEnv {
  const result = storageEnvSchema.safeParse({
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: process.env.R2_BUCKET,
  });

  if (!result.success) {
    const details = result.error.issues
      .map(
        (issue) => `${issue.path.join(".") || "(racine)"} : ${issue.message}`,
      )
      .join(" ; ");
    throw new Error(
      `Configuration de stockage invalide (voir .env.example) : ${details}`,
    );
  }

  return result.data;
}

/**
 * Configuration de stockage validée au chargement du module.
 */
export const storageEnv: StorageEnv = parseStorageEnv();

/**
 * Adresse du service R2 pour ce compte.
 *
 * @param env - Configuration à utiliser, storageEnv par défaut.
 * @returns L'URL de l'API compatible S3.
 */
export function r2Endpoint(env: StorageEnv = storageEnv): string {
  return `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}
