import {
  isProductCovered,
  productCoverageGap,
  type CoverageContext,
  type TrackCell,
} from "@/lib/admin/track-coverage";
import type { AudioType } from "@/types/domain";

/**
 * Le calcul de l'activation des offres, d'après les pistes présentes.
 *
 * @remarks
 * Fonctions PURES : elles reçoivent l'état lu en base et rendent un plan ou un
 * décompte. Rien n'est écrit ici. C'est ce qui rend vérifiable sans base la
 * règle qui décide de ce qui est vendable, et donc de ce qui est publiable.
 */

/** Une piste, réduite à ce qui la situe dans la matrice. */
export type ActivationAudioFile = { voiceId: string | null; type: AudioType };

/** Un mouvement et ses pistes. */
export type ActivationMovement = {
  id: string;
  audioFiles: ActivationAudioFile[];
};

/** Une offre, réduite à ce qui décide de son activation. */
export type ActivationProduct = {
  id: string;
  movementId: string | null;
  voiceId: string | null;
  isActive: boolean;
};

/**
 * L'état d'une oeuvre tel qu'il entre dans le calcul.
 *
 * @remarks
 * `products` ne doit contenir QUE les offres non retirées. Une offre retirée
 * désigne un pupitre qui n'est plus vendu ; la laisser entrer ferait exiger
 * ses pistes à l'offre toutes voix, qui ne redeviendrait jamais vendable.
 */
export type WorkActivationState = {
  hasAccompaniment: boolean;
  movements: ActivationMovement[];
  products: ActivationProduct[];
};

/** Ce qu'il faut écrire pour aligner l'activation sur les pistes. */
export type ActivationPlan = {
  /** Offres à passer active. */
  activate: string[];
  /** Offres à passer inactive. */
  deactivate: string[];
  /** Offres non couvertes à l'arrivée, qu'elles aient changé ou non. */
  inactive: number;
  total: number;
};

/** Ce qui manque à une oeuvre pour être publiable. */
export type MissingTracks = {
  incompleteProducts: number;
  /** Le plus grand nombre de cases manquant à une seule offre. */
  missingCells: number;
};

/**
 * Met l'état d'une oeuvre sous la forme qu'attend le calcul de couverture.
 *
 * @remarks
 * Les pupitres du contexte viennent des OFFRES, pas des pistes : ce que
 * l'oeuvre vend décide de ce qu'elle doit contenir, l'inverse rendrait toute
 * oeuvre complète par construction.
 *
 * @param work - L'oeuvre, ses mouvements et ses offres non retirées.
 * @returns Les cases présentes et le contexte de couverture.
 */
export function buildCoverageInputs(work: WorkActivationState): {
  cells: TrackCell[];
  context: CoverageContext;
} {
  const cells: TrackCell[] = work.movements.flatMap((movement) =>
    movement.audioFiles.map((piste) => ({
      movementId: movement.id,
      voiceId: piste.voiceId,
      type: piste.type,
    })),
  );

  const voiceIds = [
    ...new Set(
      work.products
        .map((product) => product.voiceId)
        .filter((id): id is string => id !== null),
    ),
  ];

  return {
    cells,
    context: {
      movementIds: work.movements.map((movement) => movement.id),
      voiceIds,
      hasAccompaniment: work.hasAccompaniment,
    },
  };
}

/**
 * Calcule quelles offres activer et lesquelles désactiver.
 *
 * @param work - L'oeuvre, ses mouvements et ses offres non retirées.
 * @returns Le plan d'activation, vide quand rien ne change.
 */
export function computeActivationPlan(
  work: WorkActivationState,
): ActivationPlan {
  const { cells, context } = buildCoverageInputs(work);

  const activate: string[] = [];
  const deactivate: string[] = [];
  let inactive = 0;

  for (const product of work.products) {
    const couvert = isProductCovered(
      { movementId: product.movementId, voiceId: product.voiceId },
      context,
      cells,
    );
    if (couvert && !product.isActive) activate.push(product.id);
    if (!couvert && product.isActive) deactivate.push(product.id);
    if (!couvert) inactive += 1;
  }

  return { activate, deactivate, inactive, total: work.products.length };
}

/**
 * Compte ce qui manque à une oeuvre pour que toutes ses offres soient vendables.
 *
 * @param work - L'oeuvre, ses mouvements et ses offres non retirées.
 * @returns Le nombre d'offres incomplètes et le plus grand manque constaté.
 */
export function computeMissingTracks(work: WorkActivationState): MissingTracks {
  const { cells, context } = buildCoverageInputs(work);

  let incompleteProducts = 0;
  let missingCells = 0;

  for (const product of work.products) {
    const ecart = productCoverageGap(
      { movementId: product.movementId, voiceId: product.voiceId },
      context,
      cells,
    );
    if (ecart.missing > 0) {
      incompleteProducts += 1;
      missingCells = Math.max(missingCells, ecart.missing);
    }
  }

  return { incompleteProducts, missingCells };
}
