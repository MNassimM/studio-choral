import "server-only";

import { cache } from "react";

import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/prisma";
import type { User } from "@/generated/prisma/client";

/**
 * Raccourci de développement permettant de se faire passer pour un compte de
 * démonstration sans ouvrir de session.
 *
 * @remarks
 * Les quatre comptes de démonstration portent des adresses fictives et ne
 * peuvent donc recevoir aucun lien de connexion. Sans ce raccourci, vérifier
 * les différents états d'accès demanderait de créer une session à la main
 * avant chaque test.
 *
 * La garde sur NODE_ENV n'est pas une simple précaution d'exécution. La valeur
 * est remplacée par sa constante à la compilation, la condition devient donc
 * toujours fausse dans un build de production et l'ensemble du bloc est
 * supprimé du bundle par l'élimination de code mort. Renseigner la variable
 * en production ne déclenche rien, puisque le code chargé de la lire n'existe
 * plus.
 *
 * Ce raccourci est provisoire. Dès que la page de connexion existera, le
 * chemin normal de test sera le lien magique affiché par le transport console,
 * qui exerce le vrai flux de bout en bout.
 *
 * @returns Le compte de démonstration désigné, ou null si le raccourci ne
 * s'applique pas.
 */
async function resolveImpersonatedUser(): Promise<User | null> {
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const email = process.env.DEMO_USER_EMAIL;
  if (!email) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    // Trace volontairement bruyante. Confondre un compte usurpé avec un
    // visiteur réel fausserait toute vérification des états d'accès.
    console.warn(
      `[auth] Usurpation de développement active : ${email}. Aucune session réelle n'est lue.`,
    );
  }
  return user;
}

/**
 * Lit la session Auth.js et rend l'utilisateur courant.
 *
 * @remarks
 * Cette fonction lit, elle ne décide pas. Un visiteur non connecté obtient
 * null, et il revient à l'appelant de choisir quoi en faire. Elle ne lève
 * jamais et ne redirige jamais, ce qui permet aux pages publiques de se
 * dégrader proprement en droits vides plutôt que de casser.
 *
 * La session ne transporte que l'identifiant de l'utilisateur. La ligne
 * complète est donc rechargée depuis la base, à la fois pour disposer des
 * champs que la session n'expose pas et pour que l'identifiant soit confronté
 * à l'état réel des données. Un compte supprimé alors qu'une session reste
 * ouverte est ainsi traité comme un visiteur.
 *
 * L'appel est mémoïsé pour la durée de la requête. Plusieurs appels dans un
 * même rendu partagent la même lecture, comme findPublishedWorkBySlug le fait
 * pour l'œuvre affichée.
 *
 * @returns L'utilisateur connecté, ou null pour un visiteur.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  // L'usurpation est examinée en premier, sinon il deviendrait impossible de
  // changer de compte de démonstration une fois une session ouverte.
  /*const impersonated = await resolveImpersonatedUser();
  if (impersonated) {
    return impersonated;
  }*/

  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return null;
    }

    return await prisma.user.findUnique({ where: { id: userId } });
  } catch (cause) {
    // Une session illisible, par exemple un cookie signé avec un ancien
    // secret, doit ramener un visiteur plutôt que de faire échouer le rendu
    // d'une page publique.
    const reason = cause instanceof Error ? cause.message : String(cause);
    console.warn(`[auth] Session illisible, visiteur supposé : ${reason}`);
    return null;
  }
});
