import "server-only";

import { prisma } from "@/lib/db/prisma";
import { resolveNameToStore } from "@/lib/auth/google-profile";

/**
 * Complète le nom d'un compte à partir du profil publié par Google.
 *
 * @remarks
 * Appelée depuis l'évènement de connexion plutôt que depuis le callback signIn,
 * pour deux raisons. La première est que le callback reçoit, dans le cas du
 * rattachement à un compte existant, l'utilisateur tel que le provider le
 * décrit, dont l'identifiant est celui de Google et non celui de notre base :
 * il n'y aurait pas de ligne à mettre à jour. La seconde est qu'écrire un nom
 * n'a pas à peser sur la décision d'autoriser une connexion.
 *
 * La fonction ne lève jamais. Ne pas réussir à enregistrer un nom d'affichage
 * ne doit pas empêcher quelqu'un de se connecter, l'en tête retombant alors sur
 * l'adresse comme elle le fait déjà pour un compte sans nom.
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
