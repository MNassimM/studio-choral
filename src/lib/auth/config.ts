import "server-only";

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/db/prisma";
import {
  authEnv,
  SESSION_MAX_AGE_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
} from "@/lib/auth/env";
import { magicLinkProvider } from "@/lib/auth/magic-link-provider";

/**
 * Configuration serveur d'Auth.js v5 pour l'authentification de l'application.
 *
 * @remarks
 * Ce module est exclusivement destiné au serveur grâce à server-only.
 * Il utilise notamment le secret d'authentification, le client Prisma et le système d'envoi d'e-mails, 
 * tous ca ne doit jamais arriver dans un bundle client.
 *
 * L'application utilise actuellement un seul provider d'authentification : le lien magique. 
 * Aucun provider OAuth n'est configuré pour le moment, afin de conserver un seul flux d'authentification à maintenir et à déboguer.
 *
 * L'authentification utilise une stratégie de session en base de données plutôt qu'une stratégie JWT. 
 * Les sessions sont donc représentées par des lignes dans la table sessions.
 *
 * @public
 */
export const { handlers, signIn, signOut, auth } = NextAuth({
  // Le client Prisma partagé du projet
  adapter: PrismaAdapter(prisma),

  /**
   * Secret utilisé par Auth.js pour ses mécanismes cryptographiques.
   */
  secret: authEnv.AUTH_SECRET,

  providers: [magicLinkProvider],

  session: {
    /**
     * Stratégie « database » choisie plutôt que « jwt » parce qu'elle permet la révocation immédiate d'un accès (supprimer la ligne)
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
});
