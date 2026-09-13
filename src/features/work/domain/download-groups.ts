import type { AudioType, WorkAccess } from "@/domain/types";
import { canDownload } from "@/domain/access/work-access";

/**
 * Construction des téléchargements d'une oeuvre.
 *
 * @remarks
 * Partagé par la page oeuvre, qui montre aussi ce qui reste verrouillé, et par
 * la bibliothèque, qui ne montre que le possédé. Une seule définition de ce
 * qui est téléchargeable, et un seul ordre d'affichage.
 */

/**
 * Types de piste réellement téléchargeables.
 */
export type DownloadableAudioType = Exclude<AudioType, "PREVIEW">;

/**
 * Rang de chaque type de piste dans la grille de téléchargements.
 *
 * @remarks
 * Les pupitres d'abord, puis le tutti, puis l'accompagnement. SOLO n'est pas
 * proposé au téléchargement aujourd'hui, il prendrait la place d'un pupitre.
 */
const DOWNLOAD_TYPE_RANK: Record<DownloadableAudioType, number> = {
  PREDOMINANT: 0,
  SOLO: 0,
  TUTTI: 1,
  ACCOMPANIMENT: 2,
};

/** Une ligne de la grille de téléchargements, verrouillée ou non. */
export type DownloadFileEntry = {
  audioFileId: string;
  audioType: DownloadableAudioType;
  voiceLabel: string | null;
  mimeType: string;
  sizeBytes: number | null;
  owned: boolean;
};

/** Les téléchargements d'un mouvement, regroupés pour le sélecteur. */
export type MovementDownloadGroup = {
  movementId: string;
  movementTitle: string;
  unlocked: boolean;
  entries: DownloadFileEntry[];
};

/** Forme minimale d'une piste pour construire les téléchargements. */
export type DownloadTrackInput = {
  id: string;
  type: AudioType;
  voiceId: string | null;
  mimeType: string;
  sizeBytes: number | null;
};

/** Forme minimale d'un mouvement pour construire les téléchargements. */
export type DownloadMovementInput = {
  id: string;
  title: string;
  audioFiles: DownloadTrackInput[];
};

/** Ce dont l'affichage a besoin pour rendre une ligne de fichier. */
export type DownloadRowView = {
  audioFileId: string;
  /** Ce que contient le fichier, déjà traduit. */
  title: string;
  /** Format et taille, déjà mis en forme. */
  meta: string;
  owned: boolean;
};

/**
 * Construit les téléchargements de chaque mouvement.
 *
 * @remarks
 * L'extrait et la voix seule sont écartés : le premier n'est pas un
 * téléchargement, la seconde n'est pas proposée aujourd'hui. Le droit vient
 * uniquement de canDownload, jamais d'une règle recopiée ici.
 *
 * @param params - Droits résolus, mouvements et correspondances de pupitres.
 * @returns Un groupe par mouvement, pistes triées.
 */
export function buildDownloadGroups({
  access,
  movements,
  voiceCodeById,
  voiceLabelByCode,
  voiceOrderByCode,
}: {
  access: WorkAccess;
  movements: DownloadMovementInput[];
  voiceCodeById: Map<string, string>;
  voiceLabelByCode: Map<string, string>;
  voiceOrderByCode: Map<string, number>;
}): MovementDownloadGroup[] {
  return movements.map((movement) => {
    const lignes: { voiceCode: string | null; entry: DownloadFileEntry }[] = [];

    for (const track of movement.audioFiles) {
      if (track.type === "PREVIEW") continue;
      if (track.type === "SOLO") continue;
      const voiceCode = track.voiceId
        ? (voiceCodeById.get(track.voiceId) ?? null)
        : null;
      lignes.push({
        voiceCode,
        entry: {
          audioFileId: track.id,
          audioType: track.type,
          voiceLabel: voiceCode
            ? (voiceLabelByCode.get(voiceCode) ?? voiceCode)
            : null,
          mimeType: track.mimeType,
          sizeBytes: track.sizeBytes,
          owned: canDownload(access, {
            movementId: movement.id,
            type: track.type,
            voiceCode,
          }),
        },
      });
    }

    // Sans ce tri, l'ordre serait celui où la base rend les lignes : rien ne le
    // garantit, il diffère d'un mouvement à l'autre et peut changer après un
    // nouvel import. Les pupitres suivent l'ordre de la table Voice, comme le
    // panneau « Votre accès » ; un pupitre inconnu de la table passe après.
    lignes.sort(
      (a, b) =>
        DOWNLOAD_TYPE_RANK[a.entry.audioType] -
          DOWNLOAD_TYPE_RANK[b.entry.audioType] ||
        (voiceOrderByCode.get(a.voiceCode ?? "") ?? Infinity) -
          (voiceOrderByCode.get(b.voiceCode ?? "") ?? Infinity),
    );

    return {
      movementId: movement.id,
      movementTitle: movement.title,
      unlocked: access.movements[movement.id].unlocked,
      entries: lignes.map((ligne) => ligne.entry),
    };
  });
}

/**
 * Met une piste en forme pour l'affichage.
 *
 * @remarks
 * Les libellés sont injectés : ce module reste sans dépendance à next-intl, et
 * la page oeuvre comme la bibliothèque rendent exactement la même ligne. Le
 * titre suit le nom du fichier téléchargé, mouvement, pupitre puis type
 * séparés par des tirets bas.
 *
 * @param entry - Piste à afficher.
 * @param labels - Traduction du type de piste et mise en forme de la taille.
 * @param movementTitle - Mouvement à préfixer, nul quand l'affichage le nomme
 * déjà autour de la ligne.
 * @returns La ligne prête à rendre.
 */
export function toDownloadRow(
  entry: DownloadFileEntry,
  labels: {
    audioTypeLabel: (type: DownloadableAudioType) => string;
    formatSize: (bytes: number) => string;
    formatLabel: (mimeType: string) => string;
  },
  movementTitle: string | null = null,
): DownloadRowView {
  const parts = [
    movementTitle,
    entry.voiceLabel,
    labels.audioTypeLabel(entry.audioType).replaceAll(" ", "-"),
  ].filter((part): part is string => Boolean(part));

  return {
    audioFileId: entry.audioFileId,
    title: parts.join("_"),
    meta:
      entry.sizeBytes !== null
        ? `${labels.formatLabel(entry.mimeType)} · ${labels.formatSize(entry.sizeBytes)}`
        : labels.formatLabel(entry.mimeType),
    owned: entry.owned,
  };
}
