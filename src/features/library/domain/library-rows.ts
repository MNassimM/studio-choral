import type { AudioType, Grant, WorkAccess } from "@/domain/types";
import { canDownload, resolveWorkAccess } from "@/domain/access/work-access";
import { buildWorkAccessInput } from "@/features/catalog/server/work-access-input";

/**
 * Lignes de la bibliothèque, une par oeuvre possédée.
 *
 * @remarks
 * Fonctions pures : aucune requête, aucune traduction. Les pistes reçues se
 * limitent à leur type et à leur pupitre, ce qui suffit à compter les fichiers
 * et à dresser la grille des pupitres. Le détail d'une piste n'est chargé
 * qu'au dépliage.
 */

/** Forme minimale d'une piste pour la bibliothèque. */
export type LibraryTrackInput = {
  type: AudioType;
  voiceId: string | null;
};

/** Forme minimale d'un mouvement pour la bibliothèque. */
export type LibraryMovementInput = {
  id: string;
  title: string;
  audioFiles: LibraryTrackInput[];
};

/** Une oeuvre possédée, telle que chargée. */
export type LibraryWorkInput = {
  id: string;
  slug: string;
  title: string;
  composer: string;
  catalogueRef: string | null;
  /** Clé de l'image de couverture, nulle tant qu'aucune n'est déposée. */
  coverImageKey: string | null;
  period: string | null;
  voicing: string | null;
  language: string | null;
  movements: LibraryMovementInput[];
};

/** Ce qu'un droit apporte à l'affichage, hors de son périmètre. */
export type LibraryGrantInput = {
  workId: string;
  grantedAt: Date;
  /** PURCHASE, MANUAL_GRANT ou PROMO. */
  source: string;
};

/** Un pupitre d'un mouvement, possédé ou non. */
export type LibraryVoiceCell = {
  code: string;
  label: string;
  owned: boolean;
};

/** Une ligne de la grille des pupitres. */
export type LibraryCoverageRow = {
  movementId: string;
  movementTitle: string;
  cells: LibraryVoiceCell[];
};

/** Une oeuvre de la bibliothèque, prête à afficher. */
export type LibraryWorkRow = {
  workId: string;
  slug: string;
  title: string;
  composer: string;
  catalogueRef: string | null;
  /** Clé de l'image de couverture, nulle tant qu'aucune n'est déposée. */
  coverImageKey: string | null;
  period: string | null;
  voicing: string | null;
  language: string | null;
  movementCount: number;
  unlockedMovementCount: number;
  /** Nombre de fichiers que l'utilisateur peut réellement télécharger. */
  downloadableCount: number;
  ownsFullWork: boolean;
  ownedVoiceLabels: string[];
  coverage: LibraryCoverageRow[];
  /** Date du droit le plus récent sur cette oeuvre. */
  addedAt: Date;
  /** Vrai si au moins un droit vient d'un achat. */
  purchased: boolean;
  /** Texte replié en minuscules, pour la recherche côté navigateur. */
  searchText: string;
};

/**
 * Construit une ligne de bibliothèque par oeuvre.
 *
 * @remarks
 * Une ligne par oeuvre et non par droit : posséder l'oeuvre entière puis
 * quelques mouvements isolés donne plusieurs LibraryItem pour une seule
 * entrée visible. Les oeuvres sans aucun accès résolu sont écartées : un droit
 * peut viser une oeuvre dépubliée ou vidée de ses pistes.
 *
 * @param params - Oeuvres chargées, droits, pupitres et libellés.
 * @returns Les lignes, de l'accès le plus récent au plus ancien.
 */
export function buildLibraryRows({
  works,
  grants,
  items,
  voices,
  getVoiceLabel,
}: {
  works: LibraryWorkInput[];
  grants: Grant[];
  items: LibraryGrantInput[];
  voices: { id: string; code: string }[];
  getVoiceLabel: (code: string) => string;
}): LibraryWorkRow[] {
  const voiceCodeById = new Map(voices.map((voice) => [voice.id, voice.code]));
  const voiceOrder = new Map(voices.map((voice, index) => [voice.code, index]));

  const rows: LibraryWorkRow[] = [];

  for (const work of works) {
    const layout = buildWorkAccessInput(work.id, work.movements, voiceCodeById);
    const access: WorkAccess = resolveWorkAccess(layout, grants);
    if (!access.ownsAnything) continue;

    const coverage: LibraryCoverageRow[] = work.movements.map((movement) => {
      const owned = access.movements[movement.id]?.ownedVoiceCodes ?? [];
      const codes = (
        layout.movements.find((m) => m.id === movement.id)?.voiceCodes ?? []
      )
        .slice()
        .sort((a, b) => (voiceOrder.get(a) ?? 0) - (voiceOrder.get(b) ?? 0));
      return {
        movementId: movement.id,
        movementTitle: movement.title,
        cells: codes.map((code) => ({
          code,
          label: getVoiceLabel(code),
          owned: owned.includes(code),
        })),
      };
    });

    let downloadableCount = 0;
    for (const movement of work.movements) {
      for (const track of movement.audioFiles) {
        if (track.type === "PREVIEW" || track.type === "SOLO") continue;
        const voiceCode = track.voiceId
          ? (voiceCodeById.get(track.voiceId) ?? null)
          : null;
        if (
          canDownload(access, {
            movementId: movement.id,
            type: track.type,
            voiceCode,
          })
        ) {
          downloadableCount += 1;
        }
      }
    }

    const droits = items.filter((item) => item.workId === work.id);
    const addedAt = droits.reduce<Date>(
      (plusRecent, item) =>
        item.grantedAt > plusRecent ? item.grantedAt : plusRecent,
      droits[0]?.grantedAt ?? new Date(0),
    );

    const ownedVoiceLabels = access.ownedVoiceCodes
      .slice()
      .sort((a, b) => (voiceOrder.get(a) ?? 0) - (voiceOrder.get(b) ?? 0))
      .map(getVoiceLabel);

    rows.push({
      workId: work.id,
      slug: work.slug,
      title: work.title,
      composer: work.composer,
      catalogueRef: work.catalogueRef,
      coverImageKey: work.coverImageKey,
      period: work.period,
      voicing: work.voicing,
      language: work.language,
      movementCount: work.movements.length,
      unlockedMovementCount: access.unlockedMovementCount,
      downloadableCount,
      ownsFullWork: access.ownsFullWork,
      ownedVoiceLabels,
      coverage,
      addedAt,
      purchased: droits.some((item) => item.source === "PURCHASE"),
      searchText:
        `${work.title} ${work.composer} ${work.catalogueRef ?? ""}`.toLowerCase(),
    });
  }

  // Du plus récemment acquis au plus ancien. L'identifiant départage : deux
  // droits accordés dans la même seconde garderaient sinon un ordre instable.
  rows.sort(
    (a, b) =>
      b.addedAt.getTime() - a.addedAt.getTime() ||
      a.workId.localeCompare(b.workId),
  );
  return rows;
}

/**
 * Résume la bibliothèque en trois chiffres.
 *
 * @param rows - Lignes de la bibliothèque.
 * @returns Nombre d'oeuvres, de mouvements débloqués et de fichiers.
 */
export function summarizeLibrary(rows: LibraryWorkRow[]): {
  works: number;
  movements: number;
  files: number;
} {
  return {
    works: rows.length,
    movements: rows.reduce((n, row) => n + row.unlockedMovementCount, 0),
    files: rows.reduce((n, row) => n + row.downloadableCount, 0),
  };
}
