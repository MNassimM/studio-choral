import type { MusicalPeriod, Prisma } from "@/generated/prisma/client";
import type { AppLocale } from "@/i18n/routing";
import { resolveWorkTranslation } from "@/lib/works/resolve-translation";

/**
 * Forme Prisma minimale nécessaire pour dériver une `WorkCardData` : les
 * mouvements (pour leur nombre), les produits actifs (pour les prix) et la
 * traduction de la locale demandée (au plus une ligne, filtrée côté requête).
 * Réutilisée par la page d'accueil et par /catalogue pour garantir la même
 * donnée dans les deux cas.
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

export type WorkWithCardRelations = Prisma.WorkGetPayload<{
  include: ReturnType<typeof buildWorkCardInclude>;
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
  /** Langue du texte chanté (ISO 639-1), ou null si non renseignée. */
  language: string | null;
  /** min(priceCents) des Product actifs de l'œuvre, ou null si aucun. */
  fromPriceCents: number | null;
  /** priceCents du Product WORK + ALL_VOICES actif, ou null si absent. */
  fullPackPriceCents: number | null;
  currency: string;
};

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
    // Jamais traduit : compositeur, référence catalogue, formation, langue
    // chantée sont des données factuelles indépendantes de la locale UI.
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
