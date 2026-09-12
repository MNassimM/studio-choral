import "server-only";

import { z } from "zod";

/**
 * Validation des variables d'environnement du module e-mail, exécutée au chargement du module
 */

const baseSchema = {
  EMAIL_FROM_ADDRESS: z.email(
    "EMAIL_FROM_ADDRESS doit être une adresse e-mail valide",
  ),
  EMAIL_FROM_NAME: z.string().min(1).optional(),
};

const emailEnvSchema = z.discriminatedUnion("EMAIL_TRANSPORT", [
  z.object({
    EMAIL_TRANSPORT: z.literal("console"),
    ...baseSchema,
  }),
  z.object({
    EMAIL_TRANSPORT: z.literal("resend"),
    RESEND_API_KEY: z
      .string()
      .min(1, 'RESEND_API_KEY est requise quand EMAIL_TRANSPORT="resend"'),
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
      .map(
        (issue) => `${issue.path.join(".") || "(racine)"} : ${issue.message}`,
      )
      .join(" ; ");
    throw new Error(
      `Configuration e-mail invalide (voir .env.example) : ${details}`,
    );
  }

  return result.data;
}

/**
 * Configuration e-mail validée au chargement du module.
 */
export const emailEnv: EmailEnv = parseEmailEnv();

/**
 * Formate l'adresse de l'expéditeur selon le format accepté par les fournisseurs d'e-mails.
 *
 * @param env - Configuration e-mail à utiliser. Utilise emailEnv par défaut.
 * @returns L'expéditeur formaté.
 */
export function formatSender(env: EmailEnv = emailEnv): string {
  return env.EMAIL_FROM_NAME
    ? `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`
    : env.EMAIL_FROM_ADDRESS;
}
