import { render, plainTextSelectors } from "@react-email/components";

/**
 * Conversion d'un gabarit en les deux corps attendus par le module d'envoi.
 *
 * @remarks
 * Le texte brut est dérivé du même arbre React que le HTML plutôt que rédigé à
 * côté. Deux versions écrites séparément finissent toujours par diverger, et
 * c'est la version texte, moins souvent relue, qui se périme en premier.
 *
 * Le corps texte n'est pas facultatif. Un message sans version texte est
 * pénalisé par les filtres antispam, et certains clients ainsi que certains
 * lecteurs d'écran n'affichent que celle ci.
 */

/**
 * Les deux corps d'un message, rendus depuis un même gabarit.
 */
export type RenderedEmail = {
  /** Corps HTML, styles déjà mis en ligne par React Email. */
  html: string;
  /** Corps en texte brut, dérivé du HTML. */
  text: string;
};

/**
 * Rend un gabarit d'e-mail en HTML et en texte brut.
 *
 * @remarks
 * Les deux rendus sont demandés en parallèle, la conversion en texte repassant
 * de toute façon par un rendu HTML complet.
 *
 * La sélection appliquée au texte reprend celle de React Email, à laquelle
 * s'ajoute une règle sur les liens. Sans elle, la conversion remplace un lien
 * par son seul libellé et l'adresse disparaît, ce qui rendrait la version
 * texte inutilisable pour un message dont le lien est justement l'objet.
 *
 * @param node - Gabarit à rendre.
 * @returns Les corps HTML et texte du message.
 */
export async function renderEmail(
  node: React.ReactNode,
): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(node),
    render(node, {
      plainText: true,
      htmlToTextOptions: {
        selectors: [
          ...plainTextSelectors,
          {
            selector: "a",
            options: { linkBrackets: false, hideLinkHrefIfSameAsText: true },
          },
        ],
      },
    }),
  ]);

  return { html, text };
}
