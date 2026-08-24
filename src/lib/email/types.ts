import "server-only";

/**
 * Représente un e-mail prêt à être envoyé par un transport d'e-mail.
 *
 * @remarks
 * Le contrat est indépendant du fournisseur utilisé pour l'envoi.
 * Les appelants ne doivent connaître que ce type et la fonction `sendEmail()`,
 * sans dépendre directement de Resend, SMTP ou d'un autre fournisseur.
 *
 * Le corps en texte brut est obligatoire, même lorsqu'une version HTML est
 * fournie. Cela garantit une compatibilité avec les clients ne prenant pas
 * en charge le HTML et améliore notamment l'accessibilité et la délivrabilité.
 *
 * Les gabarits HTML et leur rendu ne font volontairement pas partie de ce
 * contrat. Ils sont préparés en amont avant d'être transmis au transport.
 *
 * @public
 */

export type EmailMessage = {
  /** Adresse du destinataire. Un seul destinataire : ce module n'expose pas d'envoi groupé. */
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
 * @remarks
 * Le résultat est une union discriminée par 'ok'.
 * Cela oblige l'appelant à traiter explicitement les cas de succès et d'échec.
 *
 * Un échec d'envoi est retourné sous la forme { ok: false } plutôt que d'être propagé sous forme d'exception. 
 * L'appelant peut ainsi décider de la stratégie à adopter : nouvelle tentative, journalisation, notification de l'utilisateur, etc.
 *
 * @public
 */
export type SendEmailResult =
  | {
      ok: true;
      /**
       * Identifiant attribué au message par le fournisseur.
       *
       * @remarks
       * Cette valeur peut être 'null' avec le transport console utilisé uniquement en développement.
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
 * Ce qu'une implémentation de transport doit fournir. `send()` ne rejette
 * jamais : toute erreur (réseau, refus du fournisseur, exception inattendue)
 * est convertie en `{ ok: false }`.
 */

/**
 * Définit le contrat que doit respecter tout transport d'e-mail.
 *
 * @remarks
 * Un transport encapsule la communication avec un fournisseur ou un mécanisme
 * d'envoi particulier, par exemple Resend, SMTP ou un transport de développement.
 *
 * Cette abstraction permet de remplacer le fournisseur d'e-mails sans modifier
 * le code métier qui utilise le système d'envoi.
 *
 * Une implémentation doit convertir toute erreur en résultat { ok: false }.
 * La méthode send() ne doit donc jamais rejeter de promesse, y compris en cas
 * d'erreur réseau, de refus du fournisseur ou d'exception inattendue.
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
