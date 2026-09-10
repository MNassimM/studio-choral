import type { Grant } from "@/types/domain";

/**
 * Posséder "Alto, oeuvre entière" rend "Alto, Kyrie" redondant, l'un est inclus dans l'autre
 * Sur Postgre ca se modelise pas -> on le fait dans le code
 */

/**
 * Détermine si un droit en rend un autre inutile.
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
 * Construit une clé d'identité pour un droit. (pour identifier les doublons dans dedupeGrants)
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
 * NOTE : pas utilisé pour l'instant, mais pourrait servir pour nettoyer les droits d'un utilisateur avant de les stocker.
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
