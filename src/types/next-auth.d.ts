import type { DefaultSession } from "next-auth";

/**
 * Étend les types Auth.js pour ajouter l'identifiant de l'utilisateur à la session.
 *
 * @remarks
 * Auth.js n'inclut pas l'identifiant de l'utilisateur dans Session.user par défaut.
 *
 * Le callback session() défini dans src/features/auth/server/config.ts ajoute cet identifiant à partir de la base de données.
 * Cette déclaration permet à TypeScript de connaître cette propriété supplémentaire dans l'ensemble de l'application.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
