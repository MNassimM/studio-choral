import { Button, Heading, Link, Section, Text } from "@react-email/components";

import { EmailLayout } from "@/server/email/templates/layout";
import { styles } from "@/server/email/templates/theme";

/**
 * Gabarit de l'e-mail contenant le lien de connexion.
 */

/**
 * Informations nécessaires au rendu du message.
 */
export type MagicLinkEmailProps = {
  /** Langue du message, déclarée sur le document. */
  locale: string;
  /** URL complète du lien de connexion. */
  url: string;
  /** Formule d'accueil. */
  greeting: string;
  /** Titre du message. */
  heading: string;
  /** Phrase introduisant le lien. */
  instruction: string;
  /** Libellé porté par le bouton. */
  buttonLabel: string;
  /** Phrase introduisant la reprise en clair de l'URL. */
  fallbackNotice: string;
  /** Mention de la durée de validité et de l'usage unique. */
  expiry: string;
  /** Mention destinée à qui n'a rien demandé. */
  ignore: string;
  /** Signature de pied de page. */
  signature: string;
  /** Ligne d'aperçu affichée à côté de l'objet. */
  preview: string;
};

/**
 * Rend l'e-mail de connexion par lien magique.
 *
 * @param props - Chaînes déjà traduites et URL du lien.
 * @returns Le message prêt à être converti en HTML et en texte brut.
 */
function MagicLinkEmail({
  locale,
  url,
  greeting,
  heading,
  instruction,
  buttonLabel,
  fallbackNotice,
  expiry,
  ignore,
  signature,
  preview,
}: MagicLinkEmailProps) {
  return (
    <EmailLayout locale={locale} preview={preview} signature={signature}>
      <Heading style={styles.heading}>{heading}</Heading>
      <Text style={styles.paragraph}>{greeting}</Text>
      <Text style={styles.paragraph}>{instruction}</Text>

      <Section style={styles.buttonWrapper}>
        <Button href={url} style={styles.button}>
          {buttonLabel}
        </Button>
      </Section>

      <Text style={styles.muted}>{fallbackNotice}</Text>
      <Text style={styles.fallbackLink}>
        <Link href={url} style={styles.fallbackLink}>
          {url}
        </Link>
      </Text>

      <Text style={styles.muted}>{expiry}</Text>
      <Text style={styles.muted}>{ignore}</Text>
    </EmailLayout>
  );
}

export { MagicLinkEmail };
