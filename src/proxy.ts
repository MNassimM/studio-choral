import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";

// Next 16 : "middleware.ts" est renommé "proxy.ts", la fonction exportée doit
// s'appeler `proxy` (ou être l'export par défaut, comme ici). La redirection
// de langue émise par next-intl est un 307 (temporaire, préserve la méthode)
// - jamais un 301/308 permanent : la langue préférée d'un visiteur n'est pas
// une propriété figée de l'URL.
export default createMiddleware(routing);

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
