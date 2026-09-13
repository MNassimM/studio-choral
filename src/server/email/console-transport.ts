import "server-only";

import { formatSender } from "@/server/email/env";
import type {
  EmailMessage,
  EmailTransport,
  SendEmailResult,
} from "@/server/email/types";

/**
 * Transport de développement, on ecrit juste dans logs server
 * Sert à lire un lien de connexion et à le cliquer sans attendre un e-mail réel.
 */

const RULE_WIDTH = 72;

/**
 * Génère une ligne de séparation utilisée pour encadrer les messages d'e-mail dans les logs du serveur.
 *
 * @param char - Caractère utilisé pour générer la ligne.
 * @returns Une chaîne contenant RULE_WIDTH répétitions du caractère fourni.
 */
function rule(char: string): string {
  return char.repeat(RULE_WIDTH);
}

/**
 * Transport d'e-mail utilisé en développement.
 */
export const consoleTransport: EmailTransport = {
  name: "console",

  /**
   * Affiche un e-mail dans les logs du serveur sans l'envoyer.
   *
   * @param message - Message e-mail à afficher.
   * @returns Toujours un résultat de succès avec un identifiant nul
   */
  async send(message: EmailMessage): Promise<SendEmailResult> {
    const lines = [
      "",
      rule("═"),
      "  E-MAIL (transport console - AUCUN envoi réel)",
      rule("═"),
      `  De      : ${formatSender()}`,
      `  À       : ${message.to}`,
      `  Sujet   : ${message.subject}`,
      `  Format  : texte${message.html ? " + HTML (HTML non affiché)" : " seul"}`,
      rule("─"),
      "",
      message.text,
      "",
      rule("═"),
      "",
    ];

    console.info(lines.join("\n"));

    return { ok: true, id: null };
  },
};
