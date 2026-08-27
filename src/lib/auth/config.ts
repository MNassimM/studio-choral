import "server-only";

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { prisma } from "@/lib/db/prisma";
import {
  authEnv,
  isGoogleSignInEnabled,
  SESSION_MAX_AGE_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
} from "@/lib/auth/env";
import { buildGoogleProvider } from "@/lib/auth/google-provider";
import { magicLinkProvider } from "@/lib/auth/magic-link-provider";
import { checkSignInRateLimit } from "@/lib/auth/sign-in-rate-limit";

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

  /**
   * Le lien magique est toujours présent, Google ne s'ajoute que si ses
   * identifiants sont configurés. Déclarer un provider sans identifiants
   * produirait un bouton qui échoue au clic, alors qu'un provider absent
   * retire simplement ce bouton de la page.
   */
  providers: isGoogleSignInEnabled
    ? [magicLinkProvider, buildGoogleProvider()]
    : [magicLinkProvider],

  pages: {
    /**
     * Les pages d'Auth.js n'acceptent qu'un chemin statique, alors que les
     * routes du site sont localisées. Le chemin de la locale par défaut est
     * donc utilisé, sans préfixe.
     *
     * Les erreurs sont volontairement renvoyées sur la page de connexion
     * plutôt que sur une page dédiée. Un lien expiré ou déjà utilisé n'appelle
     * qu'une seule action de la part de l'utilisateur, en redemander un, et le
     * formulaire se trouve précisément là.
     */
    signIn: "/connexion",
    error: "/connexion",
  },

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
     * Applique la limitation de débit avant toute demande de lien.
     *
     * @remarks
     * Ce callback est le dernier point traversé avant qu'Auth.js ne génère le
     * jeton et ne déclenche l'envoi. Refuser ici évite donc de laisser derrière
     * soi un jeton de vérification créé pour un message jamais parti, ce qui
     * arriverait si le refus avait lieu plus tard dans la chaîne.
     *
     * Le contrôle porte sur la demande d'envoi et ignore complètement
     * l'existence d'un compte. Une adresse connue et une adresse inconnue sont
     * donc traitées exactement de la même façon, limitation comprise.
     *
     * Les connexions qui ne passent pas par une demande de lien ne sont pas
     * concernées, seul le formulaire de connexion étant visé.
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
});
