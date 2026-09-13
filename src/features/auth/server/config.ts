import "server-only";

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/server/db/prisma";
import {
  authEnv,
  isGoogleSignInEnabled,
  SESSION_MAX_AGE_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
} from "@/features/auth/server/env";
import { buildGoogleProvider } from "@/features/auth/server/google-provider";
import { magicLinkProvider } from "@/features/auth/server/magic-link-provider";
import { checkSignInRateLimit } from "@/features/auth/server/sign-in-rate-limit";
import { syncGoogleName } from "@/features/auth/server/sync-google-name";

/**
 * Configuration serveur d'Auth.js v5 pour l'authentification de l'application.
 *
 * @public
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  /**
   * Le client Prisma partagé du projet
   */
  adapter: PrismaAdapter(prisma),

  /**
   * Secret utilisé par Auth.js pour ses mécanismes cryptographiques.
   */
  secret: authEnv.AUTH_SECRET,

  /**
   * Le lien magique est toujours présent, Google ne s'ajoute que si ses identifiants sont configurés.
   */
  providers: isGoogleSignInEnabled
    ? [magicLinkProvider, buildGoogleProvider()]
    : [magicLinkProvider],

  pages: {
    signIn: "/connexion",
    error: "/connexion",
  },

  session: {
    /**
     * Stratégie "database" choisie plutôt que "jwt" parce qu'elle permet la révocation immédiate d'un accès (supprimer la ligne)
     * (mieux pour un site à contenu payant askip)
     */
    strategy: "database",
    /** 180 jours, en fenêtre glissante */
    maxAge: SESSION_MAX_AGE_SECONDS,
    /**
     * Intervalle minimal entre deux mises à jour de l'expiration d'une session.
     */
    updateAge: SESSION_UPDATE_AGE_SECONDS,
  },

  callbacks: {
    /**
     * Applique la limitation de débit avant toute demande de lien.
     *
     * @param email - Présent et marqué comme demande de vérification lorsqu'il
     * s'agit d'un envoi de lien.
     * @param user - Utilisateur candidat, dont l'adresse sert de clé de comptage.
     * @returns Vrai si la demande peut être honorée.
     */
    async signIn({ user, email }) {
      const isMagicLinkRequest = Boolean(email?.verificationRequest);
      if (!isMagicLinkRequest) {
        return true;
      }

      const address = user?.email;
      if (!address) {
        return true;
      }

      const verdict = await checkSignInRateLimit(address);
      return verdict.allowed;
    },

    /**
     * Ajoute l'identifiant de l'utilisateur à l'objet de session.
     *
     * @remarks
     *
     * Le champ session.user.id est également déclaré dans src/types/next-auth.d.ts afin que cette propriété
     * soit reconnue par TypeScript dans le reste de l'application.
     *
     * @param session - Session Auth.js à enrichir.
     * @param user - Utilisateur récupéré par l'adaptateur depuis la base.
     * @returns La session enrichie avec l'identifiant de l'utilisateur.
     */
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },

  events: {
    /**
     * Complète le nom du compte après une connexion Google
     *
     * @param user - Utilisateur connecté, tel qu'il figure en base.
     * @param account - Compte ayant servi à la connexion.
     * @param profile - Profil brut publié par le fournisseur, absent hors OAuth.
     * @returns Rien.
     */
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google" || !user.id) {
        return;
      }

      await syncGoogleName({
        userId: user.id,
        storedName: user.name,
        googleName: typeof profile?.name === "string" ? profile.name : null,
      });
    },
  },
});
