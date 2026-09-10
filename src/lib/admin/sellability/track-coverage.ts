import type { AudioType } from "@/types/domain";

/**
 * Les types de piste attendus pour chaque pupitre d'un mouvement.
 */
export const PER_VOICE_TYPES: AudioType[] = ["SOLO", "PREDOMINANT", "PREVIEW"];

/**
 * Les types de piste attendus une seule fois par mouvement.
 */
export const PER_MOVEMENT_TYPES: AudioType[] = ["TUTTI"];

/**
 * Ce qu'il faut savoir d'une oeuvre pour compter ses pistes.
 */
export type TrackExpectation = {
  movementCount: number;
  voiceCount: number;
  hasAccompaniment: boolean;
};

/**
 * L'avancement des pistes d'une oeuvre.
 */
export type TrackCoverage = {
  expected: number;
  imported: number;
  missing: number;
  /** Rapport entre 0 et 1, vaut 0 quand rien n'est attendu. */
  ratio: number;
  state: "empty" | "partial" | "complete";
};

/**
 * Compte les pistes qu'une oeuvre devrait avoir.
 *
 * Trois types par pupitre, un tutti par mouvement, plus un accompagnement par
 * mouvement si l'oeuvre en déclare.
 */
export function expectedTrackCount({
  movementCount,
  voiceCount,
  hasAccompaniment,
}: TrackExpectation): number {
  const perMovement =
    voiceCount * PER_VOICE_TYPES.length +
    PER_MOVEMENT_TYPES.length +
    (hasAccompaniment ? 1 : 0);
  return movementCount * perMovement;
}

/**
 * Compare les pistes importées à celles attendues.
 */
export function computeTrackCoverage(
  expectation: TrackExpectation,
  imported: number,
): TrackCoverage {
  const expected = expectedTrackCount(expectation);
  const missing = Math.max(0, expected - imported);
  const ratio = expected === 0 ? 0 : Math.min(1, imported / expected);

  return {
    expected,
    imported,
    missing,
    ratio,
    state: imported === 0 ? "empty" : missing === 0 ? "complete" : "partial",
  };
}

/**
 * Une case de la matrice, telle qu'elle existe en base.
 */
export type TrackCell = {
  movementId: string;
  voiceId: string | null;
  type: AudioType;
};

/**
 * Les coordonnées d'un produit, qui décident de ce qu'il doit couvrir.
 */
export type ProductCoordinates = {
  /** Nul pour un produit de périmètre oeuvre. */
  movementId: string | null;
  /** Nul pour une offre toutes voix. */
  voiceId: string | null;
};

/**
 * Ce qu'il faut savoir de l'oeuvre pour dérouler une couverture.
 */
export type CoverageContext = {
  movementIds: string[];
  voiceIds: string[];
  hasAccompaniment: boolean;
};

/**
 * Déroule les cases qu'un produit doit avoir pour être vendable.
 *
 * @param product - Les coordonnées du produit.
 * @param context - Mouvements, pupitres et accompagnement de l'oeuvre.
 * @returns Toutes les cases requises.
 */
export function requiredCellsFor(
  product: ProductCoordinates,
  context: CoverageContext,
): TrackCell[] {
  const movements =
    product.movementId === null ? context.movementIds : [product.movementId];
  const voices =
    product.voiceId === null ? context.voiceIds : [product.voiceId];

  const cells: TrackCell[] = [];
  for (const movementId of movements) {
    for (const voiceId of voices) {
      for (const type of PER_VOICE_TYPES) {
        cells.push({ movementId, voiceId, type });
      }
    }

    // Le tutti et l'accompagnement ne sont vendus que par les offres qui
    // couvrent toutes les voix.
    if (product.voiceId === null) {
      for (const type of PER_MOVEMENT_TYPES) {
        cells.push({ movementId, voiceId: null, type });
      }
      if (context.hasAccompaniment) {
        cells.push({ movementId, voiceId: null, type: "ACCOMPANIMENT" });
      }
    }
  }
  return cells;
}

/** Clé de comparaison d'une case. */
function cellKey(cell: TrackCell): string {
  return `${cell.movementId}|${cell.voiceId ?? ""}|${cell.type}`;
}

/**
 * Dit si un produit est intégralement couvert par les pistes existantes.
 *
 * @param product - Les coordonnées du produit.
 * @param context - Mouvements, pupitres et accompagnement de l'oeuvre.
 * @param existing - Les cases réellement présentes en base.
 * @returns Vrai si toutes les cases requises existent.
 */
export function isProductCovered(
  product: ProductCoordinates,
  context: CoverageContext,
  existing: TrackCell[],
): boolean {
  const presentes = new Set(existing.map(cellKey));
  const requises = requiredCellsFor(product, context);
  if (requises.length === 0) return false;
  return requises.every((cell) => presentes.has(cellKey(cell)));
}

/**
 * Compte ce qui manque à un produit, pour un message lisible.
 *
 * @param product - Les coordonnées du produit.
 * @param context - Mouvements, pupitres et accompagnement de l'oeuvre.
 * @param existing - Les cases réellement présentes en base.
 * @returns Le nombre de cases requises et le nombre de manquantes.
 */
export function productCoverageGap(
  product: ProductCoordinates,
  context: CoverageContext,
  existing: TrackCell[],
): { required: number; missing: number } {
  const presentes = new Set(existing.map(cellKey));
  const requises = requiredCellsFor(product, context);
  return {
    required: requises.length,
    missing: requises.filter((cell) => !presentes.has(cellKey(cell))).length,
  };
}
