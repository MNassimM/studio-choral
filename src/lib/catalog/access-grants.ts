import { prisma } from "@/lib/db/prisma";
import type { Grant } from "@/types/domain";

/**
 * SEULE fonction du projet qui a le droit de faire traverser une ligne
 * Prisma vers src/lib/access : elle lit les LibraryItem d'un utilisateur et
 * les traduit en Grant du domaine (workId, movementId, voiceCode, scope,
 * coverage) — lib/access ne doit jamais voir une ligne Prisma.
 *
 * Filtre sur `revokedAt: null` : un droit révoqué (remboursement, litige)
 * n'est plus un droit et ne doit jamais être résolu comme un accès valide.
 */
export async function getUserGrants(userId: string): Promise<Grant[]> {
  const items = await prisma.libraryItem.findMany({
    where: { userId, revokedAt: null },
    include: { voice: true },
  });

  return items.map(
    (item): Grant => ({
      workId: item.workId,
      movementId: item.movementId,
      voiceCode: item.voice?.code ?? null,
      scope: item.scope,
      coverage: item.coverage,
    }),
  );
}
