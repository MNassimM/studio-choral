import { prisma } from "@/lib/db/prisma";
import type { Grant } from "@/types/domain";

/**
 * Lit les droits actifs d'un utilisateur et les traduit en Grant du domaine.
 *
 * @remarks
 * C'est la SEULE fonction du projet autorisée à faire traverser une ligne
 * Prisma vers src/lib/access. Ce dernier ne doit jamais voir une ligne
 * Prisma, c'est ce qui lui permet de rester pur et testable sans base.
 *
 * Le filtre sur revokedAt vaut règle métier : un droit révoqué après un
 * remboursement ou un litige n'est plus un droit, il ne doit jamais être
 * résolu comme un accès valide. La ligne reste en base pour l'historique,
 * mais elle ne sort pas d'ici.
 *
 * @param userId - Identifiant de l'utilisateur dont on veut les droits.
 * @returns Les droits actifs, en forme domaine.
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
