import "server-only";

import { headers } from "next/headers";
import { locale as rootLocale } from "next/root-params";
import type { User } from "@/generated/prisma/client";

import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getPathname } from "@/i18n/navigation";
import { PATHNAME_HEADER } from "@/proxy";
import { routing, type AppLocale } from "@/i18n/routing";

/**
 * Garde d'accès des pages qui exigent une session ouverte.
 *
 * @remarks
 * Elle répond à une seule question, celle de savoir si une session existe.
 * Elle ne dit jamais si l'utilisateur possède telle œuvre ou tel pupitre, ce
 * qui reste du ressort de src/lib/access. Confondre les deux conduirait à
 * dupliquer les règles commerciales à un endroit qui n'a pas vocation à les
 * connaître.
 *
 * La garde vit dans le rendu des pages plutôt que dans le proxy. La
 * documentation de Next déconseille d'y placer la gestion de session, et notre
 * stratégie de session étant en base, une vérification dans le proxy
 * imposerait une requête SQL sur chaque page, y compris publiques. Le rendu
 * évite aussi toute interaction avec la réécriture de locale opérée par
 * next-intl, donc tout risque de boucle de redirection.
 */

/**
 * Reconstitue le chemin demandé pour pouvoir y revenir après connexion.
 *
 * @remarks
 * Next n'expose aucun chemin aux composants serveur, le proxy en dépose donc
 * une copie dans un en tête dédié. La valeur est déjà localisée, ce qui permet
 * de renvoyer l'utilisateur exactement là où il voulait aller sans avoir à
 * recomposer une URL.
 *
 * Une absence d'en tête n'est pas traitée comme une erreur, la garde devant
 * fonctionner même si l'information manque. Dans ce cas l'utilisateur repart
 * simplement de l'accueil après s'être connecté.
 *
 * @returns Le chemin demandé, ou null s'il ne peut pas être déterminé.
 */
async function resolveRequestedPath(): Promise<string | null> {
  const headerList = await headers();

  const candidate = headerList.get(PATHNAME_HEADER);
  return candidate && candidate.startsWith("/") ? candidate : null;
}

/**
 * Exige une session et rend l'utilisateur courant.
 *
 * @remarks
 * En l'absence de session, la fonction redirige vers la page de connexion et
 * n'atteint jamais son retour. Le segment traduit correspondant à la locale
 * active est composé par next-intl, de sorte qu'un visiteur anglophone arrive
 * bien sur la version anglaise du formulaire.
 *
 * Le chemin initialement demandé est transmis en paramètre de retour, pour que
 * la connexion ramène l'utilisateur sur la page qu'il voulait consulter plutôt
 * que sur l'accueil.
 *
 * @param options - Chemin de retour à forcer, utile si l'appelant le connaît
 * mieux que les en têtes de la requête.
 * @returns L'utilisateur connecté, la fonction ne rendant jamais null.
 */
export async function requireSession(options?: {
  returnTo?: string;
}): Promise<User> {
  const user = await getCurrentUser();
  if (user) {
    return user;
  }

  const locale = ((await rootLocale()) ?? routing.defaultLocale) as AppLocale;
  const returnTo = options?.returnTo ?? (await resolveRequestedPath());

  // Le chemin localisé est composé par next-intl, puis la redirection est
  // confiée à celle de Next. Cette séparation permet de garder le segment
  // traduit tout en profitant d'une fonction typée comme n'ayant pas de
  // retour, ce qui évite d'avoir à feindre une valeur après un appel qui
  // interrompt le rendu.
  const signInPath = getPathname({ href: "/connexion", locale });
  const destination = returnTo
    ? `${signInPath}?next=${encodeURIComponent(returnTo)}`
    : signInPath;

  redirect(destination);
}
