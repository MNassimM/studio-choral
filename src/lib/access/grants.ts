import type { Grant } from "@/types/domain";

/**
 * Déduplication sémantique des droits, ce qu'aucune contrainte SQL ne peut
 * exprimer (voir le commentaire sur le modèle Prisma LibraryItem).
 *
 * @remarks
 * Posséder « Alto, œuvre entière » rend « Alto, Kyrie » redondant, parce que
 * le premier couvre le second. Postgres ne sait pas modéliser cette relation
 * d'inclusion, elle relève donc du code.
 *
 * Ces fonctions ne sont appelées nulle part pour l'instant. Elles sont
 * prévues pour le futur webhook Stripe, qui devra les utiliser avant
 * insertion pour éviter d'accumuler des lignes redondantes à chaque achat.
 */

/**
 * Détermine si un droit en rend un autre inutile.
 *
 * @remarks
 * Vrai si a couvre tout ce que b couvre : même œuvre, portée au moins aussi
 * large, couverture de voix au moins aussi large. Un droit se couvre
 * lui-même, donc absorbs(x, x) vaut vrai.
 *
 * @param a - Droit potentiellement absorbant.
 * @param b - Droit potentiellement absorbé.
 * @returns Vrai lorsque b n'apporte rien de plus que a.
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

/**
 * Construit une clé d'identité pour un droit.
 *
 * @remarks
 * Sert uniquement à repérer les doublons stricts dans dedupeGrants. Les
 * champs nuls deviennent une chaîne vide pour que la clé reste stable.
 *
 * @param grant - Droit à identifier.
 * @returns Une clé textuelle unique pour cette combinaison de champs.
 */
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
 * Retire les droits redondants d'une liste.
 *
 * @remarks
 * Le nettoyage fonctionne dans les deux sens : un droit large ajouté après un
 * droit étroit qu'il couvre élimine ce dernier, et inversement. L'ordre
 * d'insertion ne change donc rien au résultat.
 *
 * La première passe retire les doublons stricts. Sans elle, deux droits
 * identiques s'absorberaient mutuellement et disparaîtraient tous les deux à
 * la seconde passe.
 *
 * @param grants - Droits à nettoyer, éventuellement redondants entre eux.
 * @returns La liste sans aucun droit couvert par un autre.
 */
export function dedupeGrants(grants: Grant[]): Grant[] {
  const seen = new Set<string>();
  const withoutDuplicates: Grant[] = [];
  for (const grant of grants) {
    const key = grantKey(grant);
    if (seen.has(key)) continue;
    seen.add(key);
    withoutDuplicates.push(grant);
  }

  return withoutDuplicates.filter(
    (grant, index) =>
      !withoutDuplicates.some(
        (other, otherIndex) => otherIndex !== index && absorbs(other, grant),
      ),
  );
}
