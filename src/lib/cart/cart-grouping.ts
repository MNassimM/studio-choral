import type { ResolvedCartLine } from "@/lib/cart/resolved-cart";
import type { CartItem } from "@/lib/cart/types";

/**
 * Un sous groupe de lignes, correspondant à un mouvement ou à l'oeuvre entière.
 */
export type CartMovementGroup = {
  /** Nul lorsque les lignes portent sur l'oeuvre entière. */
  movementId: string | null;
  movementTitle: string | null;
  lines: CartItem[];
};

/**
 * Les lignes du panier appartenant à une même oeuvre.
 */
export type CartWorkGroup = {
  workId: string;
  workTitle: string | null;
  /** Vrai lorsque l'oeuvre compte plusieurs mouvements à distinguer. */
  splitByMovement: boolean;
  groups: CartMovementGroup[];
};

/**
 * Regroupe les lignes du panier par oeuvre, puis par mouvement.
 *
 * Les oeuvres et les mouvements gardent leur ordre de première apparition. Un
 * sous groupe par mouvement n'apparaît que si l'oeuvre en compte plusieurs.
 *
 * @param lines - Lignes du panier, dans leur ordre d'ajout.
 * @param resolvedBySku - Lignes résolues par le serveur, indexées par référence.
 * @returns Les groupes prêts à être rendus.
 */
export function groupCartLines(
  lines: CartItem[],
  resolvedBySku: Map<string, ResolvedCartLine>,
): CartWorkGroup[] {
  const byWork = new Map<string, CartWorkGroup>();

  for (const line of lines) {
    const resolved = resolvedBySku.get(line.sku);
    const workId = resolved?.workId || line.workId;

    let work = byWork.get(workId);
    if (!work) {
      work = {
        workId,
        workTitle: resolved?.workTitle ?? null,
        splitByMovement: (resolved?.workMovementCount ?? 0) > 1,
        groups: [],
      };
      byWork.set(workId, work);
    }
    work.workTitle ??= resolved?.workTitle ?? null;
    if ((resolved?.workMovementCount ?? 0) > 1) work.splitByMovement = true;

    const movementId = resolved?.movementId ?? line.movementId;
    let group = work.groups.find((entry) => entry.movementId === movementId);
    if (!group) {
      group = {
        movementId,
        movementTitle: resolved?.movementTitle ?? null,
        lines: [],
      };
      work.groups.push(group);
    }
    group.movementTitle ??= resolved?.movementTitle ?? null;
    group.lines.push(line);
  }

  return Array.from(byWork.values());
}
