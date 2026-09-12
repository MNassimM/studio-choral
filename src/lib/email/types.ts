import "server-only";

/**
 * Représente un e-mail prêt à être envoyé par un transport d'e-mail.
 *
 * @public
 */

export type EmailMessage = {
  /** Adresse du destinataire */
  to: string;
  /** Objet de l'e-mail. */
  subject: string;
  /** Corps en texte brut, toujours requis, même quand une version html est fourni (clients sans HTML, lecteurs d'écran, antispam). */
  text: string;
  /** Corps HTML optionnel. Quand il est absent, le message part en texte seul. */
  html?: string;
};

/**
 * Représente le résultat d'une tentative d'envoi d'e-mail.
 *
 * @public
 */
export type SendEmailResult =
  | {
      ok: true;
      /**
       * Identifiant attribué au message par le fournisseur.
       */
      id: string | null;
    }
  | {
      ok: false;
      /**
       * Description lisible de la cause de l'échec.
       */
      error: string;
    };

/**
 * Définit le contrat que doit respecter tout transport d'e-mail.
 *
 * @public
 */
export type EmailTransport = {
  /** Nom du transport, pour les logs de démarrage, /!\ PAS une valeur de décision ! */
  readonly name: string;

  /**
   * Envoie un e-mail à l'aide de ce transport.
   *
   * @param message - E-mail à envoyer.
   * @returns Le résultat de la tentative d'envoi.
   */
  send(message: EmailMessage): Promise<SendEmailResult>;
};
