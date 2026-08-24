import "server-only";

import { z } from "zod";

/**
 * Validation des variables d'environnement du module e-mail, exécutée au chargement du module
 * une clé manquante fait échouer le démarrage direct, plutôt que de se découvrir le jour où un utilisateur attend son lien de connexion.
 *
 * Union discriminée sur EMAIL_TRANSPORT : RESEND_API_KEY n'est exigée que si le transport Resend est choisi
 */

const baseSchema = {
  /** Adresse d'expédition. En dev : onboarding@resend.dev (domaine de test Resend). */
  EMAIL_FROM_ADDRESS: z.email("EMAIL_FROM_ADDRESS doit être une adresse e-mail valide"),
  /** Nom d'expéditeur affiché (c'est cosmetique et optionnel) */
  EMAIL_FROM_NAME: z.string().min(1).optional(),
};

const emailEnvSchema = z.discriminatedUnion("EMAIL_TRANSPORT", [
  z.object({
    EMAIL_TRANSPORT: z.literal("console"),
    ...baseSchema,
  }),
  z.object({
    EMAIL_TRANSPORT: z.literal("resend"),
    RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY est requise quand EMAIL_TRANSPORT=\"resend\""),
    ...baseSchema,
  }),
]);

/**
 * Configuration validée du module e-mail.
 */
export type EmailEnv = z.infer<typeof emailEnvSchema>;
/**
 * Noms des transports d'e-mail disponibles.
 */
export type EmailTransportName = EmailEnv["EMAIL_TRANSPORT"];

/**
 * Valide et récupère la configuration e-mail depuis les variables d'environnement.
 *
 * @remarks
 * En cas d'erreur, seuls le chemin et le message de chaque problème sont inclus dans l'exception. 
 *
 * @returns La configuration e-mail validée.
 * @throws {Error} Lorsque la configuration e-mail est invalide ou incomplète.
 */
function parseEmailEnv(): EmailEnv {
  const result = emailEnvSchema.safeParse({
    EMAIL_TRANSPORT: process.env.EMAIL_TRANSPORT,
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  });

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(racine)"} : ${issue.message}`)
      .join(" ; ");
    throw new Error(
      `Configuration e-mail invalide (voir .env.example) : ${details}`,
    );
  }

  return result.data;
}

/**
 * Configuration e-mail validée au chargement du module.
 *
 * @remarks
 * Le parsing est effectué une seule fois, lors du premier import de ce fichier.
 */
export const emailEnv: EmailEnv = parseEmailEnv();

/**
 * Formate l'adresse de l'expéditeur selon le format accepté par les fournisseurs d'e-mails.
 *
 * @remarks
 * Lorsqu'un nom d'expéditeur est configuré, le résultat utilise le format Nom <adresse@domaine>.
 * Lorsque le nom n'est pas configuré, seule l'adresse est retournée.
 *
 * @param env - Configuration e-mail à utiliser. Utilise emailEnv par défaut.
 * @returns L'expéditeur formaté.
 */
export function formatSender(env: EmailEnv = emailEnv): string {
  return env.EMAIL_FROM_NAME
    ? `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`
    : env.EMAIL_FROM_ADDRESS;
}
