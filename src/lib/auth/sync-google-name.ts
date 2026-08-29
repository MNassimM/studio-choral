import "server-only";

import { prisma } from "@/lib/db/prisma";
import { resolveNameToStore } from "@/lib/auth/google-profile";

/**
 * Complète le nom d'un compte à partir du profil publié par Google.
 *
 * @param userId - Identifiant de la ligne utilisateur, côté base.
 * @param storedName - Nom actuellement enregistré, éventuellement absent.
 * @param googleName - Nom tel que Google le publie pour ce profil.
 * @returns Rien.
 */
export async function syncGoogleName({
  userId,
  storedName,
  googleName,
}: {
  userId: string;
  storedName: string | null | undefined;
  googleName: string | null | undefined;
}): Promise<void> {
  const name = resolveNameToStore(storedName, googleName);
  if (!name) {
    return;
  }

  try {
    await prisma.user.update({ where: { id: userId }, data: { name } });
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    console.warn(
      `[auth] Nom Google non enregistré, connexion poursuivie : ${reason}`,
    );
  }
}
