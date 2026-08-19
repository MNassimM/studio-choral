import type { MusicalPeriod, Prisma } from "@/generated/prisma/client";

/**
 * Forme Prisma minimale nécessaire pour dériver une `WorkCardData` : les
 * mouvements (pour leur nombre) et les produits actifs (pour les prix).
 * Réutilisée par la page d'accueil et par /catalogue pour garantir la même
 * donnée dans les deux cas.
 */
export const workCardInclude = {
  movements: true,
  products: {
    where: { isActive: true },
  },
} satisfies Prisma.WorkInclude;

export type WorkWithCardRelations = Prisma.WorkGetPayload<{
  include: typeof workCardInclude;
}>;

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
  /** min(priceCents) des Product actifs de l'œuvre, ou null si aucun. */
  fromPriceCents: number | null;
  /** priceCents du Product WORK + ALL_VOICES actif, ou null si absent. */
  fullPackPriceCents: number | null;
  currency: string;
};

export function deriveWorkCardData(work: WorkWithCardRelations): WorkCardData {
  const activeProducts = work.products;
  const fromPriceCents =
    activeProducts.length > 0
      ? Math.min(...activeProducts.map((product) => product.priceCents))
      : null;

  const fullPackProduct = activeProducts.find(
    (product) => product.scope === "WORK" && product.coverage === "ALL_VOICES",
  );

  return {
    slug: work.slug,
    title: work.title,
    composer: work.composer,
    catalogueRef: work.catalogueRef,
    shortDescription: work.shortDescription,
    movementsCount: work.movements.length,
    period: work.period,
    voicing: work.voicing,
    fromPriceCents,
    fullPackPriceCents: fullPackProduct ? fullPackProduct.priceCents : null,
    currency: fullPackProduct?.currency ?? activeProducts[0]?.currency ?? "EUR",
  };
}
