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
 * Quelle type de limite
 */
type AttemptScope = "email" | "ip";

/**
 * Type de la decision
 */
export type RateLimitVerdict =
  | { allowed: true }
  | {
      allowed: false;
      scope: AttemptScope;
    };

/**
 * Hexadécimal d'une empreinte de clé, pour ne pas stocker de valeur brute.
 *
 * @param scope - Nature de la clé
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
 * @returns Rien de rien.
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
  }
}

/**
 * Vérifie qu'une demande de lien soit autorisée par les limites de débit.
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
