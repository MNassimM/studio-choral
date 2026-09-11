import type { MusicalPeriod, Prisma } from "@/generated/prisma/client";
import type { AppLocale } from "@/i18n/routing";
import { resolveWorkTranslation } from "@/lib/works/resolve-translation";

/**
 * Offres qui comptent pour le prix « à partir de ».
 */
export const SELLABLE_PRODUCT_WHERE = {
  isActive: true,
  isRetired: false,
} satisfies Prisma.ProductWhereInput;

/**
 * Construit la clause include Prisma nécessaire à une carte oeuvre.
 *
 * @param locale - Locale d'interface active.
 * @returns La clause include à passer à Prisma.
 */
export function buildWorkCardInclude(locale: AppLocale) {
  return {
    movements: true,
    products: {
      where: SELLABLE_PRODUCT_WHERE,
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
  period: MusicalPeriod | null;
  voicing: string | null;
  language: string | null;
  fromPriceCents: number | null;
  fullPackPriceCents: number | null;
  currency: string;
};

/**
 * Derive les données d'affichage d'une carte à partir d'une oeuvre chargée.
 *
 * @param work - Oeuvre chargée avec buildWorkCardInclude.
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
    currency: fullPackProduct?.currency ?? activeProducts[0]?.currency ?? "EUR",
  };
}
