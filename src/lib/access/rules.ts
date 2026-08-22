/**
 * Résolution des droits d'accès. Fonctions pures : aucun import de Prisma,
 * React ou Next ici - elles reçoivent des données déjà en forme domaine
 * (src/types/domain.ts) et rendent un verdict sérialisable. C'est ce qui les
 * rend testables sans base de données et réutilisables telles quelles côté
 * Client Component.
 */

import { ACCESS_POLICY } from "@/lib/access/policy";
import type {
  AudioType,
  Capability,
  Grant,
  MovementAccess,
  WorkAccess,
  WorkAccessInput,
} from "@/types/domain";

function dedupeVoiceCodes(lists: string[][]): string[] {
  return Array.from(new Set(lists.flat()));
}

/**
 * Valeur de ACCESS_POLICY exposée telle quelle : l'appelant (une page, un
 * composant) ne doit jamais importer ACCESS_POLICY directement - seul ce
 * module a le droit de le lire. Ce ré-export est une simple valeur, pas un
 * point de décision : rien de plus qu'un raccourci de lecture.
 */
export const PREVIEW_DURATION_SECONDS = ACCESS_POLICY.previewDurationSeconds;

/**
 * Calcule, pour une œuvre et une liste de droits (déjà filtrés « actifs »
 * par l'appelant - voir src/lib/catalog), ce que l'utilisateur possède.
 *
 * Règles de couverture :
 *   - un droit de scope WORK couvre TOUS les mouvements de l'œuvre
 *   - un droit de scope MOVEMENT ne couvre que le sien
 *   - un droit de coverage ALL_VOICES couvre TOUS les pupitres du mouvement
 *   - un droit de coverage SINGLE_VOICE ne couvre que le sien
 */
export function resolveWorkAccess(
  work: WorkAccessInput,
  grants: Grant[],
): WorkAccess {
  // Les droits sur une AUTRE œuvre n'ont rien à faire ici.
  const workGrants = grants.filter((grant) => grant.workId === work.id);

  const movements: Record<string, MovementAccess> = {};

  for (const movement of work.movements) {
    let allVoicesOwned = false;
    const ownedVoiceCodes = new Set<string>();

    for (const grant of workGrants) {
      const appliesToMovement =
        grant.scope === "WORK" || grant.movementId === movement.id;
      if (!appliesToMovement) continue;

      if (grant.coverage === "ALL_VOICES") {
        allVoicesOwned = true;
        for (const code of movement.voiceCodes) ownedVoiceCodes.add(code);
      } else if (grant.voiceCode) {
        ownedVoiceCodes.add(grant.voiceCode);
      }
    }

    const unlocked = allVoicesOwned || ownedVoiceCodes.size > 0;
    const tuttiStream =
      unlocked && ACCESS_POLICY.ownedVoiceUnlocksTuttiStreaming;
    // Posséder TOUTES les voix d'un mouvement autorise toujours le
    // téléchargement du tutti, indépendamment de la politique : c'est
    // littéralement ce que l'utilisateur a acheté. La politique ne
    // s'applique qu'au cas d'un pupitre isolé (voir décision commentée
    // dans policy.ts).
    const tuttiDownload =
      allVoicesOwned ||
      (unlocked && ACCESS_POLICY.ownedVoiceUnlocksTuttiDownload);
    const studio = ACCESS_POLICY.studioRequiresOwnership ? unlocked : true;

    movements[movement.id] = {
      unlocked,
      ownedVoiceCodes: Array.from(ownedVoiceCodes),
      tuttiStream,
      tuttiDownload,
      studio,
    };
  }

  const movementList = Object.values(movements);
  const unlockedMovementCount = movementList.filter((m) => m.unlocked).length;

  const ownsFullWork =
    work.movements.length > 0 &&
    unlockedMovementCount === work.movements.length &&
    work.movements.every((movement) => {
      const owned = movements[movement.id].ownedVoiceCodes;
      return movement.voiceCodes.every((code) => owned.includes(code));
    });

  return {
    workId: work.id,
    ownsAnything: unlockedMovementCount > 0,
    ownsFullWork,
    ownedVoiceCodes: dedupeVoiceCodes(
      movementList.map((m) => m.ownedVoiceCodes),
    ),
    unlockedMovementCount,
    totalMovementCount: work.movements.length,
    movements,
  };
}

export type CapabilityQuery = {
  movementId: string;
  type: AudioType;
  voiceCode: string | null;
};

/**
 * LA fonction que devront appeler la route de streaming et la route de
 * téléchargement : masquer un bouton dans React ne protège rien, seul un
 * appel serveur à cette fonction (via la même WorkAccess déjà résolue) fait
 * foi.
 */
export function capabilitiesFor(
  access: WorkAccess,
  { movementId, type, voiceCode }: CapabilityQuery,
): Capability[] {
  if (type === "PREVIEW") {
    return ["PREVIEW"];
  }

  const movement = access.movements[movementId];
  if (!movement) {
    return [];
  }

  switch (type) {
    case "SOLO": {
      if (!voiceCode || !movement.ownedVoiceCodes.includes(voiceCode)) {
        return [];
      }
      const capabilities: Capability[] = ["STREAM"];
      if (ACCESS_POLICY.ownedVoiceUnlocksSoloDownload) {
        capabilities.push("DOWNLOAD");
      }
      if (movement.unlocked) capabilities.push("STUDIO");
      return capabilities;
    }
    case "PREDOMINANT": {
      if (!voiceCode || !movement.ownedVoiceCodes.includes(voiceCode)) {
        return [];
      }
      const capabilities: Capability[] = ["STREAM", "DOWNLOAD"];
      if (movement.unlocked) capabilities.push("STUDIO");
      return capabilities;
    }

    case "TUTTI": {
      const capabilities: Capability[] = [];
      if (movement.tuttiStream) capabilities.push("STREAM");
      if (movement.tuttiDownload) capabilities.push("DOWNLOAD");
      if (movement.tuttiStream && movement.unlocked) {
        capabilities.push("STUDIO");
      }
      return capabilities;
    }

    case "ACCOMPANIMENT": {
      const capabilities: Capability[] = [];
      if (
        movement.unlocked &&
        ACCESS_POLICY.ownedVoiceUnlocksAccompanimentStreaming
      ) {
        capabilities.push("STREAM");
      }
      if (
        movement.unlocked &&
        ACCESS_POLICY.ownedVoiceUnlocksAccompanimentDownload
      ) {
        capabilities.push("DOWNLOAD");
      }
      if (capabilities.includes("STREAM") && movement.unlocked) {
        capabilities.push("STUDIO");
      }
      return capabilities;
    }

    default:
      return [];
  }
}

/** Raccourci lisible sur capabilitiesFor(). */
export function canStream(access: WorkAccess, query: CapabilityQuery): boolean {
  return capabilitiesFor(access, query).includes("STREAM");
}

/** Raccourci lisible sur capabilitiesFor(). */
export function canDownload(
  access: WorkAccess,
  query: CapabilityQuery,
): boolean {
  return capabilitiesFor(access, query).includes("DOWNLOAD");
}
