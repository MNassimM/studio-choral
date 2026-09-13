import { handlers } from "@/features/auth/server/config";

/**
 * Route handler Auth.js.
 *
 * Emplacement volontairement hors du segment [locale] : les URL d'Auth.js (/api/auth/signin, /api/auth/callback/...)
 * sont des points d'API, pas des pages traduites les localiser n'aurait aucun sens
 */
export const { GET, POST } = handlers;
