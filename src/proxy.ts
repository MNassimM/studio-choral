import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";

import { routing } from "@/i18n/routing";

/**
 * En tête portant le chemin de la requête courante.
 *
 * @remarks
 * Next n'expose aucun moyen de connaître le chemin demandé depuis un composant
 * serveur, alors que la garde de session en a besoin pour ramener l'utilisateur
 * là où il voulait aller. Le proxy est le seul endroit qui voit encore l'URL
 * complète, il la recopie donc dans un en tête que le rendu pourra lire.
 */
export const PATHNAME_HEADER = "x-bsc-pathname";

const handleI18nRouting = createMiddleware(routing);

/**
 * Proxy du site, chargé du routage localisé.
 *
 * @remarks
 * En Next 16 le fichier middleware.ts est renommé proxy.ts. La redirection de
 * langue émise par next-intl est temporaire et non permanente, la langue
 * préférée d'un visiteur n'étant pas une propriété figée de l'URL.
 *
 * Le proxy ne vérifie aucune session. La documentation de Next déconseille d'y
 * placer la gestion de session, et la stratégie de session du projet étant en
 * base, une vérification ici imposerait une requête SQL sur chaque page, y
 * compris publiques. La garde vit donc dans le rendu, voir
 * src/lib/auth/require-session.ts.
 *
 * Le seul ajout au comportement de next-intl est l'en tête de chemin. Il est
 * posé sur la réponse que next-intl a construite plutôt que sur une réponse
 * concurrente, afin de ne rien changer à la réécriture de locale.
 *
 * @param request - Requête entrante.
 * @returns La réponse de next-intl, enrichie du chemin demandé.
 */
export default function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);

  response.headers.set(
    PATHNAME_HEADER,
    request.nextUrl.pathname + request.nextUrl.search,
  );

  return response;
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
