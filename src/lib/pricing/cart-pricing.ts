import type {
  AccessScope,
  Grant,
  VoiceCoverage,
  WorkAccessInput,
} from "@/types/domain";
import {
  computeAllVoicesDiscount,
  type AllVoicesDiscount,
} from "@/lib/pricing/all-voices-discount";

/**
 * Coordonnées suffisantes pour mesurer ce qu'un droit ou un article couvre.
 */
export type CoverageCoordinates = {
  workId: string;
  movementId: string | null;
  voiceCode: string | null;
  scope: AccessScope;
  coverage: VoiceCoverage;
};

/**
 * Produit du catalogue tel qu'il entre dans le calcul de prix.
 */
export type PricedProduct = CoverageCoordinates & {
  sku: string;
  name: string;
  priceCents: number;
  currency: string;
};

/**
 * Une ligne du panier une fois son prix résolu.
 */
export type PricedCartLine = {
  sku: string;
  /** Nul lorsque le produit a disparu du catalogue ou a été désactivé. */
  name: string | null;
  /** Nul lorsque le produit est indisponible. */
  priceCents: number | null;
  currency: string | null;
  /** Nul lorsque la ligne ne bénéficie d'aucune remise. */
  discount: AllVoicesDiscount | null;
  /** Montant réellement compté dans le total, en centimes. */
  payableCents: number;
  /** Référence de l'article qui absorbe celui ci, ou null. */
  absorbedBy: string | null;
  /** Vrai lorsque le produit n'existe plus ou n'est plus actif. */
  unavailable: boolean;
};

/**
 * Résultat complet de la tarification d'un panier.
 */
export type PricedCart = {
  lines: PricedCartLine[];
  /** Somme des lignes facturables, en centimes. */
  totalCents: number;
  /** Devise du total, nulle quand aucune ligne n'est facturable. */
  currency: string | null;
  /** Nombre de lignes exclues du total parce qu'absorbées. */
  absorbedCount: number;
  /** Nombre de lignes exclues du total parce qu'indisponibles. */
  unavailableCount: number;
};

/**
 * Construit la clé d'une cellule mouvement fois voix.
 *
 * @param workId - Oeuvre à laquelle la cellule appartient.
 * @param movementId - Mouvement de la cellule.
 * @param voiceCode - Pupitre de la cellule.
 * @returns La clé de la cellule.
 */
function cellKey(
  workId: string,
  movementId: string,
  voiceCode: string,
): string {
  return `${workId}\u0000${movementId}\u0000${voiceCode}`;
}

/**
 * Énumère les cellules mouvement fois voix que couvrent des coordonnées.
 *
 * @param coordinates - Coordonnées d'un droit ou d'un article.
 * @param layout - Mouvements de l'oeuvre et pupitres de chacun.
 * @returns Les clés des cellules couvertes.
 */
export function coveredCells(
  coordinates: CoverageCoordinates,
  layout: WorkAccessInput,
): string[] {
  if (coordinates.workId !== layout.id) return [];

  const movements =
    coordinates.scope === "WORK"
      ? layout.movements
      : layout.movements.filter(
          (movement) => movement.id === coordinates.movementId,
        );

  const cells: string[] = [];
  for (const movement of movements) {
    const voiceCodes =
      coordinates.coverage === "ALL_VOICES"
        ? movement.voiceCodes
        : movement.voiceCodes.filter((code) => code === coordinates.voiceCode);
    for (const code of voiceCodes) {
      cells.push(cellKey(layout.id, movement.id, code));
    }
  }
  return cells;
}

/**
 * Réunit en un seul ensemble les cellules couvertes par plusieurs coordonnées.
 *
 * @param coordinatesList - Droits ou articles à mesurer.
 * @param layouts - Disposition de chaque oeuvre concernée, indexée par identifiant.
 * @returns L'ensemble des cellules couvertes, sans doublon.
 */
export function unionOfCoveredCells(
  coordinatesList: CoverageCoordinates[],
  layouts: Map<string, WorkAccessInput>,
): Set<string> {
  const cells = new Set<string>();
  for (const coordinates of coordinatesList) {
    const layout = layouts.get(coordinates.workId);
    if (!layout) continue;
    for (const cell of coveredCells(coordinates, layout)) cells.add(cell);
  }
  return cells;
}

/**
 * Ce que la tarification du panier attend en entrée.
 */
export type PriceCartParams = {
  /** Lignes du panier, chacune accompagnée de son état d'absorption. */
  lines: { sku: string; absorbedBy: string | null }[];
  /** Produits du catalogue correspondant aux références présentes. */
  products: Map<string, PricedProduct>;
  /** Disposition de chaque oeuvre concernée. */
  layouts: Map<string, WorkAccessInput>;
  /** Droits déjà détenus par l'utilisateur. */
  grants: Grant[];
};

/**
 * Calcule le prix de chaque ligne du panier, puis le total.
 *
 * La remise d'un pack toutes voix se mesure sur l'union des cellules déjà
 * couvertes, qu'elles le soient par un droit détenu ou par un autre article
 * facturable du panier. Une cellule couverte deux fois n'est comptée qu'une.
 *
 * @param params - Lignes du panier, catalogue, dispositions et droits.
 * @returns Les lignes tarifées et le total facturable.
 */
export function priceCart({
  lines,
  products,
  layouts,
  grants,
}: PriceCartParams): PricedCart {
  // Seules les lignes facturables couvrent du contenu pour les autres. Une
  // ligne absorbée ou indisponible ne remise donc rien.
  const billableCoordinates = lines
    .filter((line) => line.absorbedBy === null)
    .map((line) => products.get(line.sku))
    .filter((product): product is PricedProduct => product !== undefined);

  const pricedLines: PricedCartLine[] = lines.map((line) => {
    const product = products.get(line.sku);

    if (!product) {
      return {
        sku: line.sku,
        name: null,
        priceCents: null,
        currency: null,
        discount: null,
        payableCents: 0,
        absorbedBy: line.absorbedBy,
        unavailable: true,
      };
    }

    const base: Omit<PricedCartLine, "discount" | "payableCents"> = {
      sku: product.sku,
      name: product.name,
      priceCents: product.priceCents,
      currency: product.currency,
      absorbedBy: line.absorbedBy,
      unavailable: false,
    };

    if (line.absorbedBy !== null) {
      return { ...base, discount: null, payableCents: 0 };
    }

    const layout = layouts.get(product.workId);
    if (product.coverage !== "ALL_VOICES" || !layout) {
      return { ...base, discount: null, payableCents: product.priceCents };
    }

    const productCells = new Set(coveredCells(product, layout));
    const alreadyCovered = unionOfCoveredCells(
      [
        ...grants,
        ...billableCoordinates.filter((other) => other.sku !== product.sku),
      ],
      layouts,
    );

    let ownedUnits = 0;
    for (const cell of productCells) {
      if (alreadyCovered.has(cell)) ownedUnits += 1;
    }

    if (ownedUnits === 0 || productCells.size === 0) {
      return { ...base, discount: null, payableCents: product.priceCents };
    }

    const discount = computeAllVoicesDiscount(
      { ownedUnits, totalUnits: productCells.size },
      product.priceCents,
    );
    return { ...base, discount, payableCents: discount.discountedCents };
  });

  let totalCents = 0;
  let currency: string | null = null;
  let absorbedCount = 0;
  let unavailableCount = 0;

  for (const line of pricedLines) {
    if (line.unavailable) {
      unavailableCount += 1;
      continue;
    }
    if (line.absorbedBy !== null) {
      absorbedCount += 1;
      continue;
    }
    totalCents += line.payableCents;
    currency ??= line.currency;
  }

  return {
    lines: pricedLines,
    totalCents,
    currency,
    absorbedCount,
    unavailableCount,
  };
}
