import "server-only";
import { emailEnv } from "@/server/email/env";
import { consoleTransport } from "@/server/email/console-transport";
import type {
  EmailMessage,
  EmailTransport,
  SendEmailResult,
} from "@/server/email/types";

/**
 * Résout le transport d'e-mail à utiliser selon la configuration de l'environnement.
 *
 * @returns Le transport d'e-mail correspondant à la configuration actuelle.
 */
async function resolveTransport(): Promise<EmailTransport> {
  if (emailEnv.EMAIL_TRANSPORT === "resend") {
    const { resendTransport } = await import("@/server/email/resend-transport");
    return resendTransport;
  }
  return consoleTransport;
}

/**
 * Promesse correspondant au chargement du transport d'e-mail.
 */
let transportPromise: Promise<EmailTransport> | null = null;

/**
 * Retourne le transport d'e-mail configuré.
 *
 * @returns Une promesse contenant le transport d'e-mail configuré.
 */
function getTransport(): Promise<EmailTransport> {
  transportPromise ??= resolveTransport();
  return transportPromise;
}

/**
 * Point d'entrée public du module d'envoi d'e-mails.
 *
 * @param message - Message e-mail à envoyer.
 * @returns Le résultat de la tentative d'envoi.
 */
export async function sendEmail(
  message: EmailMessage,
): Promise<SendEmailResult> {
  try {
    const transport = await getTransport();
    return await transport.send(message);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: `Transport e-mail indisponible : ${reason}` };
  }
}

export type { EmailMessage, SendEmailResult } from "@/server/email/types";
