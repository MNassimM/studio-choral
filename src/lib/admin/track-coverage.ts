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
