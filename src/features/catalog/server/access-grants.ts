import { prisma } from "@/server/db/prisma";
import type { Grant } from "@/domain/types";

/**
 * Lit les droits actifs d'un utilisateur et les traduit en Grant du domaine.
 *
 * @param userId - Identifiant de l'utilisateur dont on veut les droits.
 * @returns Les droits actifs, en forme domaine.
 */
export async function getUserGrants(userId: string): Promise<Grant[]> {
  const items = await prisma.libraryItem.findMany({
    where: { userId, revokedAt: null },
    include: { voice: true },
  });

  return items.map((item): Grant => ({
    workId: item.workId,
    movementId: item.movementId,
    voiceCode: item.voice?.code ?? null,
    scope: item.scope,
    coverage: item.coverage,
  }));
}
