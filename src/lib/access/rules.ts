import { ACCESS_POLICY } from "@/lib/access/policy";
import type {
  AudioType,
  Capability,
  Grant,
  MovementAccess,
  WorkAccess,
  WorkAccessInput,
} from "@/types/domain";

/**
 * Résolution des droits d'accès du projet.
 *
 * @remarks
 * Fonctions pures : aucun import de Prisma, React ou Next ici. Elles
 * reçoivent des données déjà en forme domaine (src/types/domain.ts) et
 * rendent un verdict sérialisable. C'est ce qui les rend testables sans base
 * de données et réutilisables telles quelles côté Client Component.
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
 * Un appelant (page, composant) ne doit jamais importer ACCESS_POLICY
 * directement, seul ce module a le droit de le lire. Ce ré-export est une
 * simple valeur, pas un point de décision : rien de plus qu'un raccourci de
 * lecture.
 */
export const PREVIEW_DURATION_SECONDS = ACCESS_POLICY.previewDurationSeconds;

/**
 * Calcule ce qu'un utilisateur possède sur une œuvre donnée.
 *
 * @remarks
 * Les droits reçus sont supposés déjà filtrés comme actifs par l'appelant,
 * voir src/lib/catalog qui écarte les lignes révoquées avant de produire ces
 * Grant.
 *
 * Règles de couverture appliquées ici :
 * un droit de portée WORK couvre TOUS les mouvements de l'œuvre, un droit de
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
    // s'applique qu'au cas d'un pupitre isolé (voir policy.ts).
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
 * @remarks
 * C'est LA fonction que devront appeler la route de streaming et la route de
 * téléchargement. Masquer un bouton dans React ne protège rien, seul un appel
 * serveur à cette fonction, via la même WorkAccess déjà résolue, fait foi.
 *
 * L'extrait est le seul cas qui court-circuite tout : il reste accessible
 * même sans aucun droit, c'est le principe de l'aperçu gratuit.
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
