import "server-only";

import Google from "next-auth/providers/google";

import { authEnv } from "@/lib/auth/env";
import { mapGoogleProfile } from "@/lib/auth/google-profile";

/**
 * Provider Google, second chemin de connexion à côté du lien magique.
 *
 * @remarks
 * Le lien magique reste le chemin par défaut. Google ne fait que s'ajouter,
 * sans rien changer à son fonctionnement.
 *
 * Ce module n'est chargé que lorsque les identifiants sont présents, voir
 * isGoogleSignInEnabled. Le secret client ne quitte jamais le serveur, la
 * directive server-only faisant échouer le build si un composant client
 * remontait jusqu'ici.
 */

/**
 * Construit le provider Google configuré pour ce site.
 *
 * @remarks
 * Le réglage de liaison autorise Auth.js à rattacher cette connexion à un
 * compte déjà présent portant la même adresse. Sans lui, Auth.js lève
 * OAuthAccountNotLinked et l'utilisateur se retrouve bloqué sans comprendre
 * pourquoi, ses achats restant attachés à un compte qu'il ne peut plus
 * atteindre par ce chemin.
 *
 * Ce que ce réglage suppose mérite d'être énoncé : que le fournisseur vérifie
 * réellement les adresses qu'il publie. Si ce n'était pas le cas, quelqu'un
 * pourrait créer chez lui un compte portant l'adresse d'un tiers et hériterait
 * du compte de ce tiers ici, achats compris. Google procède à cette
 * vérification, ce qui rend le rattachement acceptable. Le raisonnement vaut
 * pour Google et pour lui seul, il devra donc être repris avant d'ajouter un
 * autre fournisseur.
 *
 * @returns Le provider prêt à être placé dans la configuration.
 */
export function buildGoogleProvider() {
  return Google({
    clientId: authEnv.AUTH_GOOGLE_ID,
    clientSecret: authEnv.AUTH_GOOGLE_SECRET,

    allowDangerousEmailAccountLinking: true,

    profile: mapGoogleProfile,
  });
}
