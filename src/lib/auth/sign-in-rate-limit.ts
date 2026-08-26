import "server-only";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { prisma } from "@/lib/db/prisma";
import {
  authEnv,
  isSignInRateLimitDisabled,
  SIGN_IN_ATTEMPT_RETENTION_SECONDS,
  SIGN_IN_EMAIL_MAX_ATTEMPTS,
  SIGN_IN_EMAIL_WINDOW_SECONDS,
  SIGN_IN_IP_MAX_ATTEMPTS,
  SIGN_IN_IP_WINDOW_SECONDS,
} from "@/lib/auth/env";

/**
 * Limitation de débit des demandes de lien de connexion.
 *
 * @remarks
 * Le contrôle a lieu côté serveur, au moment où Auth.js décide d'envoyer. 
 * Un controle coté client sert à rien, on peut toujours faire la requête directement.
 */

/**
 * Nature de la clé comptée.
 */
type AttemptScope = "email" | "ip";

/**
 * Verdict rendu à l'appelant.
 */
export type RateLimitVerdict =
  | { allowed: true }
  | {
      allowed: false;
      /** Nature de la limite atteinte, utile aux traces mais jamais affichée. */
      scope: AttemptScope;
    };

/**
 * Calcule l'empreinte d'une clé de comptage.
 *
 * @remarks
 * L'adresse e-mail n'est jamais stockée ni journalisée en clair. Une empreinte
 * suffit à reconnaître deux tentatives d'une même adresse, sans que la table
 * ne devienne un registre des personnes ayant essayé de se connecter.
 *
 * @param scope - Nature de la clé, incluse pour qu'une adresse et une IP de
 * même valeur textuelle ne puissent pas se confondre.
 * @param value - Valeur brute à masquer.
 * @returns L'empreinte hexadécimale.
 */
function hashKey(scope: AttemptScope, value: string): string {
  return createHash("sha256")
    .update(`${scope}:${value}:${authEnv.AUTH_SECRET}`)
    .digest("hex");
}

/**
 * Lit l'adresse IP de la requête courante.
 *
 * @remarks
 *
 * La première valeur de la liste est retenue parce que les proxys ajoutent la
 * leur en fin de chaîne, la plus ancienne étant celle du client d'origine.
 *
 * C'est la limite par adresse e-mail qui protège réellement la boîte d'un
 * tiers, celle par IP ne servant qu'à freiner un balayage sur des adresses
 * variées.
 *
 * @returns L'adresse lue, ou null si aucun en tête ne la porte.
 */
async function resolveClientIp(): Promise<string | null> {
  const headerList = await headers();

  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return headerList.get("x-real-ip") ?? null;
}

/**
 * Compte les tentatives récentes pour une clé donnée.
 *
 * @param scope - Nature de la clé.
 * @param keyHash - Empreinte de la clé.
 * @param windowSeconds - Largeur de la fenêtre glissante.
 * @returns Le nombre de tentatives dans la fenêtre.
 */
async function countRecentAttempts(
  scope: AttemptScope,
  keyHash: string,
  windowSeconds: number,
): Promise<number> {
  return prisma.signInAttempt.count({
    where: {
      scope,
      keyHash,
      createdAt: { gte: new Date(Date.now() - windowSeconds * 1000) },
    },
  });
}

/**
 * Supprime les traces trop anciennes pour compter encore.
 *
 * @remarks
 * La purge est déclenchée au fil des tentatives plutôt que par une tâche
 * planifiée, le projet n'ayant pas d'ordonnanceur.
 *
 * Un échec est délibérément ignoré. Ne pas réussir à faire le ménage ne doit
 * jamais empêcher quelqu'un de se connecter.
 *
 * @returns Rien.
 */
async function purgeExpiredAttempts(): Promise<void> {
  try {
    await prisma.signInAttempt.deleteMany({
      where: {
        createdAt: {
          lt: new Date(Date.now() - SIGN_IN_ATTEMPT_RETENTION_SECONDS * 1000),
        },
      },
    });
  } catch {
    // Silence volontaire, voir la remarque ci dessus.
  }
}

/**
 * Vérifie qu'une demande de lien peut être honorée, et l'enregistre.
 *
 * @remarks
 * Les deux limites sont indépendantes. Celle par adresse protège la boîte d'un
 * tiers, celle par adresse IP freine un balayage portant sur des adresses
 * variées. Atteindre l'une suffit à refuser.
 *
 * La tentative n'est enregistrée que lorsqu'elle est autorisée. Compter aussi
 * les tentatives refusées prolongerait le blocage à chaque nouvel essai, ce qui
 * transformerait une limite de quinze minutes en blocage indéfini pour un
 * utilisateur qui insiste.
 *
 * En cas de panne de la base, la demande est autorisée. Un formulaire de
 * connexion rendu inutilisable par l'indisponibilité d'une table de compteurs
 * serait un dégât plus grand que le risque qu'elle couvre.
 *
 * @param email - Adresse déjà normalisée par le provider.
 * @returns Le verdict, autorisant ou non l'envoi.
 */
export async function checkSignInRateLimit(
  email: string,
): Promise<RateLimitVerdict> {
  if (isSignInRateLimitDisabled) {
    return { allowed: true };
  }

  try {
    const emailHash = hashKey("email", email);
    const emailAttempts = await countRecentAttempts(
      "email",
      emailHash,
      SIGN_IN_EMAIL_WINDOW_SECONDS,
    );
    if (emailAttempts >= SIGN_IN_EMAIL_MAX_ATTEMPTS) {
      // L'empreinte est tronquée dans la trace, assez pour rapprocher deux
      // évènements liés sans jamais reconstituer l'adresse.
      console.warn(
        `[auth] Limite par adresse atteinte (empreinte ${emailHash.slice(0, 12)})`,
      );
      return { allowed: false, scope: "email" };
    }

    const ip = await resolveClientIp();
    const ipHash = ip ? hashKey("ip", ip) : null;

    if (ipHash) {
      const ipAttempts = await countRecentAttempts(
        "ip",
        ipHash,
        SIGN_IN_IP_WINDOW_SECONDS,
      );
      if (ipAttempts >= SIGN_IN_IP_MAX_ATTEMPTS) {
        console.warn(
          `[auth] Limite par IP atteinte (empreinte ${ipHash.slice(0, 12)})`,
        );
        return { allowed: false, scope: "ip" };
      }
    }

    await prisma.signInAttempt.createMany({
      data: ipHash
        ? [
            { scope: "email", keyHash: emailHash },
            { scope: "ip", keyHash: ipHash },
          ]
        : [{ scope: "email", keyHash: emailHash }],
    });

    // La purge suit l'enregistrement plutôt que de le précéder, pour ne pas
    // retarder le verdict rendu à l'utilisateur.
    await purgeExpiredAttempts();

    return { allowed: true };
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    console.warn(
      `[auth] Limitation de débit indisponible, demande autorisée : ${reason}`,
    );
    return { allowed: true };
  }
}
