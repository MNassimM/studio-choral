/**
 * Déduplication SÉMANTIQUE des droits — ce qu'aucune contrainte SQL ne peut
 * exprimer (voir le commentaire sur le modèle Prisma LibraryItem) :
 * posséder « Alto — œuvre entière » rend « Alto — Kyrie » redondant, parce
 * que le premier COUVRE le second.
 *
 * Non utilisée nulle part pour l'instant : sera appelée par le futur
 * webhook Stripe avant insertion, pour éviter d'accumuler des lignes
 * redondantes à chaque achat.
 */

import type { Grant } from "@/types/domain";

/**
 * `a` rend-il `b` inutile ? Vrai si `a` couvre tout ce que `b` couvre (même
 * œuvre, scope au moins aussi large, coverage au moins aussi large) — y
 * compris quand `a` et `b` sont identiques (un droit se couvre lui-même).
 */
export function absorbs(a: Grant, b: Grant): boolean {
  if (a.workId !== b.workId) {
    return false;
  }

  const scopeCovers =
    b.scope === "MOVEMENT"
      ? a.scope === "WORK" ||
        (a.scope === "MOVEMENT" && a.movementId === b.movementId)
      : a.scope === "WORK";

  const coverageCovers =
    b.coverage === "SINGLE_VOICE"
      ? a.coverage === "ALL_VOICES" ||
        (a.coverage === "SINGLE_VOICE" && a.voiceCode === b.voiceCode)
      : a.coverage === "ALL_VOICES";

  return scopeCovers && coverageCovers;
}

function grantKey(grant: Grant): string {
  return [
    grant.workId,
    grant.scope,
    grant.movementId ?? "",
    grant.coverage,
    grant.voiceCode ?? "",
  ].join("|");
}

/**
 * Retire les droits redondants d'une liste, dans les deux sens : un droit
 * large ajouté APRÈS un droit étroit qu'il couvre élimine ce dernier, tout
 * comme l'inverse (l'ordre d'insertion ne doit rien changer au résultat).
 */
export function dedupeGrants(grants: Grant[]): Grant[] {
  // 1. Retirer les doublons stricts (même œuvre/scope/mouvement/coverage/
  //    voix), en conservant la première occurrence — sans cette passe, deux
  //    droits identiques s'absorberaient mutuellement et disparaîtraient
  //    tous les deux à l'étape 2.
  const seen = new Set<string>();
  const withoutDuplicates: Grant[] = [];
  for (const grant of grants) {
    const key = grantKey(grant);
    if (seen.has(key)) continue;
    seen.add(key);
    withoutDuplicates.push(grant);
  }

  // 2. Retirer tout droit strictement absorbé par un AUTRE droit restant.
  return withoutDuplicates.filter(
    (grant, index) =>
      !withoutDuplicates.some(
        (other, otherIndex) => otherIndex !== index && absorbs(other, grant),
      ),
  );
}
