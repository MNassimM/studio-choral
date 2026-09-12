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
  /** Nom du bucket privé, celui des fichiers audio. */
  R2_BUCKET: z.string().min(1, "R2_BUCKET est requise"),
  /**
   * Nom du bucket PUBLIC, celui des images de couverture.
   *
   * @remarks
   * Un second bucket, et non un préfixe du premier : R2 n'ouvre l'accès
   * public que par bucket entier. Séparer garantit qu'aucune erreur de
   * configuration ne peut rendre une piste audio lisible sans achat.
   */
  R2_PUBLIC_BUCKET: z.string().min(1, "R2_PUBLIC_BUCKET est requise"),
  /**
   * Adresse publique du bucket de couvertures, sans barre finale.
   *
   * @remarks
   * Le domaine r2.dev du bucket, ou un domaine personnalisé. C'est la racine
   * des URL d'image rendues dans les pages, et l'hôte déclaré dans
   * next.config.ts.
   */
  R2_PUBLIC_BASE_URL: z
    .string()
    .min(1, "R2_PUBLIC_BASE_URL est requise")
    .url("R2_PUBLIC_BASE_URL doit être une URL absolue")
    .refine(
      (v) => !v.endsWith("/"),
      "R2_PUBLIC_BASE_URL ne prend pas de barre finale",
    ),
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
    R2_PUBLIC_BUCKET: process.env.R2_PUBLIC_BUCKET,
    R2_PUBLIC_BASE_URL: process.env.R2_PUBLIC_BASE_URL,
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
