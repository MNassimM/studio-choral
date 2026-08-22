import { defineRouting } from "next-intl/routing";

/**
 * Français = langue par défaut, sans préfixe d'URL ("/catalogue"). Anglais
 * préfixé ("/en/catalog"). Les segments sont traduits (pas de simple préfixe
 * de locale devant un chemin français).
 *
 * /works/[slug] est déclaré alors que la page n'existe pas encore (demandé
 * explicitement) ; /panier, /compte, /bibliotheque, /a-propos et les pages
 * légales du footer sont dans le même cas - déjà liées depuis header.tsx,
 * mobile-nav.tsx et footer.tsx sans page derrière - et déclarées ici pour la
 * même raison : le Link i18n exige que tout href interne soit une clé
 * connue de cette table dès qu'elle contient un chemin traduit, donc les
 * laisser de côté aurait cassé la compilation des liens existants.
 */
export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "as-needed",
  pathnames: {
    "/": "/",
    "/catalogue": {
      fr: "/catalogue",
      en: "/catalog",
    },
    "/comment-ca-marche": {
      fr: "/comment-ca-marche",
      en: "/how-it-works",
    },
    "/works/[slug]": {
      fr: "/oeuvres/[slug]",
      en: "/works/[slug]",
    },
    "/panier": {
      fr: "/panier",
      en: "/cart",
    },
    "/compte": {
      fr: "/compte",
      en: "/account",
    },
    "/bibliotheque": {
      fr: "/bibliotheque",
      en: "/library",
    },
    "/a-propos": {
      fr: "/a-propos",
      en: "/about",
    },
    "/conditions-generales": {
      fr: "/conditions-generales",
      en: "/terms",
    },
    "/mentions-legales": {
      fr: "/mentions-legales",
      en: "/legal",
    },
    "/confidentialite": {
      fr: "/confidentialite",
      en: "/privacy",
    },
  },
});

export type AppLocale = (typeof routing.locales)[number];
