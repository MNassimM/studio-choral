import type { Prisma } from "@/generated/prisma/client";

/**
 * Forme Prisma minimale nécessaire pour dériver une `WorkCardData` : les
 * mouvements (pour le nombre de mouvements et l'effectif vocal déduit des
 * AudioFile) et les produits actifs (pour les prix). Réutilisée par la page
 * d'accueil et par /catalogue pour garantir la même donnée dans les deux cas.
 */
export const workCardInclude = {
  movements: {
    include: {
      audioFiles: {
        where: { voiceId: { not: null } },
        select: { voice: { select: { code: true } } },
      },
    },
  },
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
  /** "SATB" si les quatre pupitres sont présents, sinon la liste des codes. */
  voicing: string;
  /** min(priceCents) des Product actifs de l'œuvre, ou null si aucun. */
  fromPriceCents: number | null;
  /** priceCents du Product WORK + ALL_VOICES actif, ou null si absent. */
  fullPackPriceCents: number | null;
  currency: string;
};

const SATB_CODES = ["SOPRANO", "ALTO", "TENOR", "BASS"];

/**
 * Déduit l'effectif vocal d'une œuvre à partir des voix réellement
 * présentes dans ses AudioFile (jamais des pupitres divisés hors SATB, qui
 * n'apparaissent dans aucun AudioFile pour l'instant). "SATB" si les quatre
 * pupitres de base sont couverts, sinon la liste triée des codes trouvés.
 */
function deriveVoicing(work: WorkWithCardRelations): string {
  const voiceCodes = new Set<string>();
  for (const movement of work.movements) {
    for (const audioFile of movement.audioFiles) {
      if (audioFile.voice) {
        voiceCodes.add(audioFile.voice.code);
      }
    }
  }

  if (SATB_CODES.every((code) => voiceCodes.has(code))) {
    return "SATB";
  }
  if (voiceCodes.size > 0) {
    return [...voiceCodes].sort().join(", ");
  }
  return "—";
}

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
    voicing: deriveVoicing(work),
    fromPriceCents,
    fullPackPriceCents: fullPackProduct ? fullPackProduct.priceCents : null,
    currency: fullPackProduct?.currency ?? activeProducts[0]?.currency ?? "EUR",
  };
}
