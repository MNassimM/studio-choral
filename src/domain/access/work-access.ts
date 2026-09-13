import { ACCESS_POLICY } from "@/domain/access/policy";
import type {
  AudioType,
  Capability,
  Grant,
  MovementAccess,
  WorkAccess,
  WorkAccessInput,
} from "@/domain/types";

/**
 * Résolution des droits d'accès du projet.
 *
 * @remarks
 * Fonctions purs.
 * Elles reçoivent des données déjà en forme domaine (src/domain/types.ts)
 */

/**
 * Déduplique une liste de listes de codes de pupitre.
 *
 * @param lists - Listes de codes à fusionner.
 * @returns Les codes uniques, dans leur ordre de première apparition.
 */
function dedupeVoiceCodes(lists: string[][]): string[] {
  return Array.from(new Set(lists.flat()));
}

/**
 * Durée de l'extrait gratuit, exposée telle quelle depuis ACCESS_POLICY.
 *
 * @remarks
 * Pour eviter de propager partout la dépendance à ACCESS_POLICY
 */
export const PREVIEW_DURATION_SECONDS = ACCESS_POLICY.previewDurationSeconds;

/**
 * Calcule ce qu'un utilisateur possède sur une oeuvre donnée.
 *
 * @remarks
 * Règles de couverture appliquées ici :
 * un droit de portée WORK couvre TOUS les mouvements de l'oeuvre, un droit de
 * portée MOVEMENT ne couvre que le sien, un droit ALL_VOICES couvre TOUS les
 * pupitres du mouvement, et un droit SINGLE_VOICE ne couvre que le sien.
 *
 * @param work - Œuvre et ses mouvements, en forme domaine.
 * @param grants - Droits détenus par l'utilisateur, actifs uniquement.
 * @returns L'état d'accès complet, mouvement par mouvement.
 */
export function resolveWorkAccess(
  work: WorkAccessInput,
  grants: Grant[],
): WorkAccess {
  // Les droits portant sur une AUTRE œuvre n'ont rien à faire ici.
  const workGrants = grants.filter((grant) => grant.workId === work.id);

  const movements: Record<string, MovementAccess> = {};

  for (const movement of work.movements) {
    let hasAllVoicesGrant = false;
    const ownedVoiceCodes = new Set<string>();

    for (const grant of workGrants) {
      const appliesToMovement =
        grant.scope === "WORK" || grant.movementId === movement.id;
      if (!appliesToMovement) continue;

      if (grant.coverage === "ALL_VOICES") {
        hasAllVoicesGrant = true;
        for (const code of movement.voiceCodes) ownedVoiceCodes.add(code);
      } else if (grant.voiceCode) {
        ownedVoiceCodes.add(grant.voiceCode);
      }
    }

    // Deux routes mènent au même droit : l'offre toutes voix, ou le cumul de
    // tous les pupitres du mouvement. Les deux coûtent le même prix, elles
    // doivent donc ouvrir exactement les mêmes accès - l'offre toutes voix
    // n'est qu'un achat unique, elle n'apporte aucun avantage propre.
    // Le garde sur la longueur n'est pas décoratif : [].every() vaut vrai, et
    // un mouvement sans pupitre enregistré ouvrirait le tutti à qui n'a rien.
    const allVoicesOwned =
      hasAllVoicesGrant ||
      (movement.voiceCodes.length > 0 &&
        movement.voiceCodes.every((code) => ownedVoiceCodes.has(code)));

    const unlocked = allVoicesOwned || ownedVoiceCodes.size > 0;
    const tuttiStream =
      unlocked && ACCESS_POLICY.ownedVoiceUnlocksTuttiStreaming;
    const tuttiDownload =
      allVoicesOwned ||
      (unlocked && ACCESS_POLICY.ownedVoiceUnlocksTuttiDownload);
    const studio = ACCESS_POLICY.studioRequiresOwnership ? unlocked : true;

    movements[movement.id] = {
      unlocked,
      ownedVoiceCodes: Array.from(ownedVoiceCodes),
      allVoicesOwned,
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

/**
 * Désigne une piste audio précise dont on veut connaître les capacités.
 */
export type CapabilityQuery = {
  movementId: string;
  type: AudioType;
  voiceCode: string | null;
};

/**
 * Détermine ce qu'une piste audio autorise pour un accès donné.
 *
 * @param access - Droits déjà résolus pour l'œuvre concernée.
 * @param query - Piste visée : mouvement, type de piste et pupitre éventuel.
 * @returns Les capacités accordées, éventuellement aucune.
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

/**
 * Indique si une piste peut être écoutée en streaming.
 *
 * @param access - Droits déjà résolus pour l'œuvre.
 * @param query - Piste visée.
 * @returns Vrai si l'écoute est autorisée.
 */
export function canStream(access: WorkAccess, query: CapabilityQuery): boolean {
  return capabilitiesFor(access, query).includes("STREAM");
}

/**
 * Indique si une piste peut être téléchargée.
 *
 * @param access - Droits déjà résolus pour l'œuvre.
 * @param query - Piste visée.
 * @returns Vrai si le téléchargement est autorisé.
 */
export function canDownload(
  access: WorkAccess,
  query: CapabilityQuery,
): boolean {
  return capabilitiesFor(access, query).includes("DOWNLOAD");
}
