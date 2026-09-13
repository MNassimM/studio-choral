import "server-only";

import Google from "next-auth/providers/google";

import { authEnv } from "@/features/auth/server/env";
import { mapGoogleProfile } from "@/features/auth/server/google-profile";

/**
 * Provider Google, second chemin de connexion à côté du lien magique.
 */

/**
 * Construit le provider Google configuré pour ce site.
 *
 * @returns Le provider a mettre dans la configuration
 */
export function buildGoogleProvider() {
  return Google({
    clientId: authEnv.AUTH_GOOGLE_ID,
    clientSecret: authEnv.AUTH_GOOGLE_SECRET,
    allowDangerousEmailAccountLinking: true,
    profile: mapGoogleProfile,
  });
}
