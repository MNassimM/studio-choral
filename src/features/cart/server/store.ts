import "server-only";

import { prisma } from "@/server/db/prisma";
import type { CartItem } from "@/features/cart/domain/types";
import type { AccessScope, VoiceCoverage } from "@/domain/types";

/**
 * Le panier d'un utilisateur connecté, tel qu'il est rangé en base.
 *
 * @remarks
 * Seul fichier à faire traverser une ligne Prisma vers le domaine du panier,
 * sur le modèle de features/catalog/server/access-grants.ts.
 */

/** Une ligne telle que la base la rend. */
type CartLineRow = {
  sku: string;
  workId: string;
  movementId: string | null;
  voiceCode: string | null;
  scope: AccessScope;
  coverage: VoiceCoverage;
  addedAt: Date;
};

/**
 * Traduit une ligne de base en article du domaine.
 *
 * @param line - Ligne lue en base.
 * @returns L'article correspondant.
 */
function toCartItem(line: CartLineRow): CartItem {
  return {
    sku: line.sku,
    workId: line.workId,
    movementId: line.movementId,
    voiceCode: line.voiceCode,
    scope: line.scope,
    coverage: line.coverage,
    addedAt: line.addedAt.getTime(),
  };
}

/**
 * Lit le panier d'un utilisateur.
 *
 * @param userId - Utilisateur concerné.
 * @returns Ses articles, du plus ancien ajout au plus récent.
 */
export async function readUserCart(userId: string): Promise<CartItem[]> {
  const lignes = await prisma.cartLine.findMany({
    where: { userId },
    orderBy: [{ addedAt: "asc" }, { sku: "asc" }],
    select: {
      sku: true,
      workId: true,
      movementId: true,
      voiceCode: true,
      scope: true,
      coverage: true,
      addedAt: true,
    },
  });

  return lignes.map(toCartItem);
}

/**
 * Remplace le panier d'un utilisateur.
 *
 * @remarks
 * Remplacement complet plutôt qu'une suite d'ajouts et de retraits : le
 * panier est minuscule, et un état posé d'un bloc ne peut pas diverger de ce
 * que le navigateur affiche. Le tout dans une transaction, sans quoi un
 * incident laisserait un panier vidé mais non réécrit.
 *
 * @param userId - Utilisateur concerné.
 * @param items - Articles à conserver.
 */
export async function writeUserCart(
  userId: string,
  items: readonly CartItem[],
): Promise<void> {
  await prisma.$transaction([
    prisma.cartLine.deleteMany({ where: { userId } }),
    prisma.cartLine.createMany({
      data: items.map((item) => ({
        userId,
        sku: item.sku,
        workId: item.workId,
        movementId: item.movementId,
        voiceCode: item.voiceCode,
        scope: item.scope,
        coverage: item.coverage,
        addedAt: new Date(item.addedAt),
      })),
    }),
  ]);
}
