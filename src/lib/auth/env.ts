import "server-only";

import { z } from "zod";

/**
 * Validation des variables d'environnement d'authentification, exécutée au chargement du module (même principe que src/lib/email/env.ts)
 *
 * AUTH_SECRET sert à signer/chiffrer les jetons Auth.js.
 * En générer un : "npx auth secret".
 *
 * AUTH_URL est optionnelle : Auth.js déduit l'URL de la requête entrante
 * en développement comme en production sur la plupart des hébergeurs.
 */

const authEnvSchema = z.object({
  AUTH_SECRET: z
    .string()
    .min(
      32,
      "AUTH_SECRET doit faire au moins 32 caractères (générer avec `npx auth secret`)",
    ),
  AUTH_URL: z.url("AUTH_URL doit être une URL absolue").optional(),

  /**
   * Identifiants du client OAuth Google.
   */
  AUTH_GOOGLE_ID: z.string().min(1).optional(),
  AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
});

/**
 * Représente la configuration d'authentification validée.
 */
export type AuthEnv = z.infer<typeof authEnvSchema>;

/**
 * Valide et récupère la configuration d'authentification depuis les variables d'environnement.
 *
 * @returns La configuration d'authentification validée.
 * @throws {Error} Lorsque la configuration d'authentification est absente ou invalide.
 */
function parseAuthEnv(): AuthEnv {
  const result = authEnvSchema.safeParse({
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
  });

  if (!result.success) {
    // Uniquement le chemin et le message de chaque problème
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(racine)"} : ${issue.message}`)
      .join(" ; ");
    throw new Error(
      `Configuration d'authentification invalide (voir .env.example) : ${details}`,
    );
  }

  return result.data;
}

/** Constante de module parsée une seule fois, au premier import. */
export const authEnv: AuthEnv = parseAuthEnv();

/**
 * Durée de vie d'une session, en secondes -> 180 jours en fenêtre glissante.
 */
export const SESSION_MAX_AGE_SECONDS = 180 * 24 * 60 * 60;

/**
 * Fréquence de rafraîchissement de l'expiration en base, en secondes : 24 heures. Si l'utilisateur revient avant ce délai, 
 * la session est prolongée uniquement côté client, sans toucher à la base (ca ferait trop de requêtes).
 */
export const SESSION_UPDATE_AGE_SECONDS = 24 * 60 * 60;

/**
 * Durée de validité du lien de connexion
 */
export const MAGIC_LINK_MAX_AGE_SECONDS = 60 * 60;

/**
 * Nombre de demandes de lien tolérées pour une même adresse, et durée de la
 * fenêtre correspondante en secondes.
 */
export const SIGN_IN_EMAIL_MAX_ATTEMPTS = 3;
export const SIGN_IN_EMAIL_WINDOW_SECONDS = 15 * 60;

/**
 * Nombre de demandes tolérées depuis une même adresse IP, et durée de la
 * fenêtre correspondante en secondes.
 */
export const SIGN_IN_IP_MAX_ATTEMPTS = 15;
export const SIGN_IN_IP_WINDOW_SECONDS = 60 * 60;

/**
 * Durée de conservation des traces de tentative, en secondes.
 */
export const SIGN_IN_ATTEMPT_RETENTION_SECONDS = 2 * 60 * 60;

/**
 * Indique si la limitation de débit est désactivée.
 */
export const isSignInRateLimitDisabled =
  process.env.NODE_ENV !== "production" &&
  process.env.AUTH_RATE_LIMIT_DISABLED === "true";

/**
 * Indique si la connexion Google est utilisable
 */
export const isGoogleSignInEnabled = Boolean(
  authEnv.AUTH_GOOGLE_ID && authEnv.AUTH_GOOGLE_SECRET,
);
