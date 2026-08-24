import "server-only";

// Importer env ici garantit que la validation des variables d'environnement a lieu dès le chargement de ce module, donc au démarrage
// du serveur pour tout appelant qui l'importe, pas au premier envoi.
import { emailEnv } from "@/lib/email/env";
import { consoleTransport } from "@/lib/email/console-transport";
import type { EmailMessage, EmailTransport, SendEmailResult } from "@/lib/email/types";


/**
 * Résout le transport d'e-mail à utiliser selon la configuration de
 * l'environnement.
 *
 * @remarks
 * Le transport Resend est chargé dynamiquement uniquement lorsque
 * EMAIL_TRANSPORT vaut "resend".
 *
 * Lorsque le transport "console" est utilisé, la bibliothèque resend
 * et son client ne sont jamais chargés. Pas besoin de clé API resend pour développer.
 *
 * @returns Le transport d'e-mail correspondant à la configuration actuelle.
 */
async function resolveTransport(): Promise<EmailTransport> {
  if (emailEnv.EMAIL_TRANSPORT === "resend") {
    const { resendTransport } = await import("@/lib/email/resend-transport");
    return resendTransport;
  }
  return consoleTransport;
}

/**
 * Promesse correspondant au chargement du transport d'e-mail.
 *
 * @remarks
 * La promesse elle-même est mémorisée plutôt que son résultat.
 * -> si plusieurs appels concurrents lors du tout premier envoi -> partageront la même opération de résolution du transport 
 * au lieu d'en déclencher plusieurs en même temps.
 */
let transportPromise: Promise<EmailTransport> | null = null;

/**
 * Retourne le transport d'e-mail configuré.
 *
 * @remarks
 * Le transport n'est résolu qu'une seule fois. Une fois la promesse créée,
 * tous les appels suivants réutilisent cette même promesse.
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
 * @remarks
 * Il s'agit de la seule fonction que les appelants du système d'e-mail
 * (magic link, confirmation d'achat, facture, etc.) doivent utiliser.
 *
 * Le code depend / connait pas le fournisseur d'e-mails ni le transport utilisé. Il ne fait qu'appeler sendEmail() avec un message.
 *
 * La fonction ne rejette jamais de promesse. Resultat sous forme d'un objet { ok: true } ou { ok: false, error: string }.
 * C'est à l'appelant de décider de la stratégie à adopter en cas d'échec 
 *
 * @param message - Message e-mail à envoyer.
 * @returns Le résultat de la tentative d'envoi.
 */
export async function sendEmail(message: EmailMessage): Promise<SendEmailResult> {
  try {
    const transport = await getTransport();
    return await transport.send(message);
  } catch (cause) {
    // Filet de sécurité : couvre l'échec de chargement du transport lui-même
    // (import dynamique en erreur, client Resend impossible à construire).
    const reason = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: `Transport e-mail indisponible : ${reason}` };
  }
}

export type { EmailMessage, SendEmailResult } from "@/lib/email/types";
