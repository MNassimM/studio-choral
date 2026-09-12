import "server-only";

import { Resend } from "resend";

import { emailEnv, formatSender } from "@/lib/email/env";
import type {
  EmailMessage,
  EmailTransport,
  SendEmailResult,
} from "@/lib/email/types";

/**
 * SEUL fichier du projet autorisé à importer la lib resend. Tout le reste
 * passe par sendEmail() et les types de types.ts
 *
 * Ce module n'est chargé que lorsque EMAIL_TRANSPORT="resend"
 */

/**
 * Crée le client Resend à partir de la configuration de l'environnement (emailEnv.EMAIL_TRANSPORT).
 *
 * @returns Une instance configurée du client Resend.
 * @throws {Error} Si le transport Resend est chargé alors que le transport n'est pas configuré sur "resend".
 */

function createClient(): Resend {
  if (emailEnv.EMAIL_TRANSPORT !== "resend") {
    throw new Error(
      'Le transport Resend a été chargé alors que EMAIL_TRANSPORT ne vaut pas "resend".',
    );
  }
  return new Resend(emailEnv.RESEND_API_KEY);
}

const client = createClient();

/**
 * Transport d'e-mails utilisant l'API Resend.
 */
export const resendTransport: EmailTransport = {
  name: "resend",

  /**
   * Envoie un e-mail via l'API Resend.
   *
   * @param message - Message e-mail à envoyer.
   * @returns Le résultat de la tentative d'envoi.
   */
  async send(message: EmailMessage): Promise<SendEmailResult> {
    try {
      const { data, error } = await client.emails.send({
        from: formatSender(),
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.html ? { html: message.html } : {}),
      });

      if (error) {
        return { ok: false, error: `${error.name} : ${error.message}` };
      }

      return { ok: true, id: data?.id ?? null };
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      return { ok: false, error: `Envoi Resend impossible : ${reason}` };
    }
  },
};
