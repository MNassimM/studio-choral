import type { MusicalPeriod, Prisma } from "@/generated/prisma/client";
import type { AppLocale } from "@/i18n/routing";
import { resolveWorkTranslation } from "@/lib/works/resolve-translation";

/**
 * Construit la clause include Prisma nécessaire à une carte œuvre.
 *
 * @remarks
 * Partagée entre la page d'accueil et le catalogue pour garantir que les deux
 * chargent exactement la même donnée. Si l'une des deux divergeait, une carte
 * pourrait afficher un prix ou un nombre de mouvements différent selon la
 * page où on la regarde.
 *
 * Les traductions sont filtrées par locale dès la requête, ce qui garantit au
 * plus une ligne et permet à resolveWorkTranslation de lire directement le
 * premier élément.
 *
 * @param locale - Locale d'interface active.
 * @returns La clause include à passer à Prisma.
 */
export function buildWorkCardInclude(locale: AppLocale) {
  return {
    movements: true,
    products: {
      where: { isActive: true },
    },
    translations: {
      where: { locale },
    },
  } satisfies Prisma.WorkInclude;
}

/**
 * Œuvre telle que chargée avec la clause include ci-dessus.
 */
export type WorkWithCardRelations = Prisma.WorkGetPayload<{
  include: ReturnType<typeof buildWorkCardInclude>;
}>;

/**
 * Données nécessaires à l'affichage d'une carte œuvre, déjà résolues.
 */
export type WorkCardData = {
  slug: string;
  title: string;
  composer: string;
  catalogueRef: string | null;
  shortDescription: string | null;
  movementsCount: number;
  /** Courant musical, ou null si l'œuvre est en cours de catalogage. */
  period: MusicalPeriod | null;
  /** Formation vocale saisie à la main, ou null si non renseignée. */
  voicing: string | null;
  /** Langue du texte chanté (ISO 639-1), ou null si non renseignée. */
  language: string | null;
  /** Prix le plus bas parmi les produits actifs, ou null si aucun. */
  fromPriceCents: number | null;
  /** Prix du produit couvrant l'œuvre entière et toutes les voix, ou null. */
  fullPackPriceCents: number | null;
  currency: string;
};

/**
 * Dérive les données d'affichage d'une carte à partir d'une œuvre chargée.
 *
 * @remarks
 * Les prix sont calculés ici plutôt qu'en base : le prix d'appel est le
 * minimum des produits actifs, et le prix du pack complet celui du produit
 * de portée WORK couvrant toutes les voix. Rien n'est stocké, tout est
 * dérivé, ce qui évite d'avoir à maintenir des colonnes cohérentes avec le
 * catalogue de produits.
 *
 * Le compositeur, la référence catalogue, la formation et la langue chantée
 * ne sont jamais traduits : ce sont des données factuelles, indépendantes de
 * la langue d'interface.
 *
 * @param work - Œuvre chargée avec buildWorkCardInclude.
 * @param locale - Locale d'interface active.
 * @returns Les données prêtes à afficher.
 */
export function deriveWorkCardData(
  work: WorkWithCardRelations,
  locale: AppLocale,
): WorkCardData {
  const resolved = resolveWorkTranslation(work, locale);

  const activeProducts = work.products;
  const fromPriceCents =
    activeProducts.length > 0
      ? Math.min(...activeProducts.map((product) => product.priceCents))
      : null;

  const fullPackProduct = activeProducts.find(
    (product) => product.scope === "WORK" && product.coverage === "ALL_VOICES",
  );

  return {
    slug: resolved.slug,
    title: resolved.title,
    composer: work.composer,
    catalogueRef: work.catalogueRef,
    shortDescription: resolved.shortDescription,
    movementsCount: work.movements.length,
    period: work.period,
    voicing: work.voicing,
    language: work.language,
    fromPriceCents,
    fullPackPriceCents: fullPackProduct ? fullPackProduct.priceCents : null,
    // Repli en cascade : la devise du pack complet fait autorité, sinon celle
    // du premier produit actif, sinon l'euro par défaut.
    currency: fullPackProduct?.currency ?? activeProducts[0]?.currency ?? "EUR",
  };
}
