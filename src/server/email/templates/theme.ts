/**
 * Palette et styles partagés par tous les e-mails du site.
 */

/**
 * Couleurs reprises de la charte du site.
 */
export const colors = {
  background: "#faf6ef",
  surface: "#ffffff",
  foreground: "#2a2620",
  muted: "#6b6459",
  primary: "#b8863e",
  onPrimary: "#fffbf2",
  border: "#e7dfcc",
} as const;

/**
 * Pile de polices pour le texte courant et les titres.
 */
const fontFamily =
  "Helvetica Neue, Helvetica,'Arial', 'Times New Roman', Times, serif";

const sansFamily =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * Nom du site, affiché en tête et en pied de chaque message.
 *
 * @remarks
 * Défini ici plutôt que dans chaque appelant pour que l'en tête, le pied de
 * page et le contenu des messages ne puissent pas diverger.
 */
export const SITE_NAME = "Butterfly Studio Choral";

/**
 * Styles partagés, appliqués en ligne par React Email.
 *
 * @remarks
 * Aucun de ces styles n'utilise flexbox, grid ni position. Ces mécanismes ne
 * sont pas interprétés par plusieurs clients répandus, qui reviennent à un
 * empilement de blocs. Tout est donc construit en blocs et en marges.
 */
export const styles = {
  /** Fond de la fenêtre du message, visible autour du contenu. */
  body: {
    backgroundColor: colors.background,
    color: colors.foreground,
    fontFamily: sansFamily,
    margin: 0,
    padding: "24px 12px",
  },

  /** Bloc central, largeur bornée pour rester lisible sur grand écran. */
  container: {
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: "12px",
    margin: "0 auto",
    maxWidth: "560px",
    padding: "32px",
  },

  /** Nom du site en tête, composé en texte et non en image. */
  wordmark: {
    color: colors.primary,
    fontFamily,
    fontSize: "20px",
    fontWeight: 700,
    letterSpacing: "0.01em",
    margin: "0 0 24px",
    textAlign: "center" as const,
  },

  /** Titre du message. */
  heading: {
    color: colors.foreground,
    fontFamily,
    fontSize: "22px",
    fontWeight: 700,
    lineHeight: "30px",
    margin: "0 0 16px",
  },

  /** Paragraphe courant. */
  paragraph: {
    color: colors.foreground,
    fontSize: "16px",
    lineHeight: "24px",
    margin: "0 0 16px",
  },

  /** Mention secondaire, moins appuyée que le texte courant. */
  muted: {
    color: colors.muted,
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0 0 16px",
  },

  /** Unique bouton d'action du message. */
  button: {
    backgroundColor: colors.primary,
    borderRadius: "999px",
    color: colors.onPrimary,
    display: "inline-block",
    fontSize: "16px",
    fontWeight: 600,
    padding: "14px 28px",
    textDecoration: "none",
  },

  /** Conteneur du bouton, qui porte le centrage et les marges. */
  buttonWrapper: {
    margin: "24px 0",
    textAlign: "center" as const,
  },

  /**
   * Reprise en clair de la destination du bouton.
   *
   * @remarks
   * Le mot coupe partout, une URL longue débordant sinon du bloc central sur
   * les fenêtres étroites.
   */
  fallbackLink: {
    color: colors.primary,
    fontSize: "13px",
    lineHeight: "20px",
    margin: "0 0 8px",
    wordBreak: "break-all" as const,
  },

  /** Filet de séparation avant le pied de page. */
  divider: {
    border: "none",
    borderTop: `1px solid ${colors.border}`,
    margin: "28px 0 20px",
  },

  /** Signature de pied de page. */
  footer: {
    color: colors.muted,
    fontSize: "13px",
    lineHeight: "20px",
    margin: 0,
    textAlign: "center" as const,
  },
} as const;
