import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Text,
} from "@react-email/components";

import { SITE_NAME, styles } from "@/server/email/templates/theme";

/**
 * Enveloppe commune à tous les e-mails du site.
 *
 * @remarks
 * Elle porte tout ce qui ne dépend pas du message envoyé, à savoir la
 * structure du document, la langue déclarée, le fond, le bloc central, le nom
 * du site en tête et la signature en pied. Un nouveau gabarit n'a donc qu'à
 * fournir son contenu, sans reprendre ni la mise en page ni les styles.
 */

/**
 * Rend l'enveloppe commune autour du contenu d'un message.
 *
 * @param children - Contenu propre au message, inséré dans le bloc central.
 * @param locale - Langue du message, déclarée sur l'élément racine pour les
 * lecteurs d'écran et pour la césure.
 * @param preview - Ligne affichée par les clients de messagerie à côté de
 * l'objet, dans la liste des messages. Elle n'apparaît pas dans le corps.
 * @param signature - Signature affichée en pied de page.
 * @returns Le document du message.
 */
function EmailLayout({
  children,
  locale,
  preview,
  signature,
}: {
  children: React.ReactNode;
  locale: string;
  preview: string;
  signature: string;
}) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.wordmark}>{SITE_NAME}</Text>
          {children}
          <Hr style={styles.divider} />
          <Text style={styles.footer}>{signature}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export { EmailLayout };
