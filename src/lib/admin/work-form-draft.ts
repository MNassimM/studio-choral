import type { z } from "zod";

import type {
  workFormSchema,
  WorkFormValues,
} from "@/lib/admin/work-form-schema";

/**
 * Le brouillon manipulé par le formulaire d'oeuvre.
 */

/** Le type d'entrée du schéma, avant transformation. */
type WorkFormInput = z.input<typeof workFormSchema>;

/**
 * Un mouvement en cours d'édition.
 */
export type MovementDraft = WorkFormInput["movements"][number];

/**
 * Ce que le formulaire tient en mémoire.
 */
export type WorkFormDraft = WorkFormInput;

/** Une case de la matrice audio, telle que le brouillon la porte. */
export type TrackDraft = WorkFormInput["tracks"][number];

/**
 * Ce que renvoient createWork et updateWork.
 */
export type WorkActionResult =
  { ok: true; workId: string } | { ok: false; error: string; field?: string };

/** Rend une clé de mouvement stable, unique pour la session d'édition. */
export function newMovementKey(): string {
  return crypto.randomUUID();
}

/** Un brouillon vide, prêt pour la page de création. */
export function emptyWorkFormDraft(): WorkFormDraft {
  return {
    title: "",
    composer: "",
    slug: "",
    catalogueRef: null,
    shortDescription: "",
    description: "",
    period: null,
    voicing: null,
    language: null,
    composedYear: null,
    hasAccompaniment: false,
    translations: {
      en: { slug: "", title: null, shortDescription: null, description: null },
    },
    voiceCodes: [],
    movements: [{ key: newMovementKey(), title: "" }],
    tracks: [],
    prices: {
      movementSingleVoice: null,
      movementAllVoices: null,
      workSingleVoice: 0,
      workAllVoices: 0,
    },
  };
}

/** Repasse un brouillon en valeurs d'action, sans les clés de mouvement. */
export function toWorkFormValues(draft: WorkFormDraft): WorkFormValues {
  return draft as WorkFormValues;
}

/**
 * Une oeuvre telle qu'elle sort de la base, réduite au strict nécessaire.
 */
export type WorkRow = {
  slug: string;
  title: string;
  composer: string;
  catalogueRef: string | null;
  shortDescription: string | null;
  description: string | null;
  period: WorkFormDraft["period"];
  voicing: string | null;
  language: string | null;
  composedYear: number | null;
  hasAccompaniment: boolean;
  movements: {
    id: string;
    title: string;
    audioFiles: {
      id: string;
      type: TrackDraft["type"];
      voice: { code: string } | null;
    }[];
  }[];
  translations: {
    locale: string;
    slug: string;
    title: string | null;
    shortDescription: string | null;
    description: string | null;
  }[];
  products: {
    scope: string;
    coverage: string;
    priceCents: number;
    isActive: boolean;
    voiceId: string | null;
    voice: { code: string } | null;
  }[];
};

/** Repasse des centimes en euros, ou nul si le prix n'existe pas. */
function toEuros(cents: number | undefined): number | null {
  return cents === undefined ? null : cents / 100;
}

/**
 * Convertit une oeuvre de la base en brouillon éditable.
 *
 * @param work - L'oeuvre chargée depuis la base.
 * @returns Le brouillon prêt pour le formulaire.
 */
export function workToDraft(work: WorkRow): WorkFormDraft {
  const anglais = work.translations.find(
    (translation) => translation.locale === "en",
  );

  // Une offre retirée de la vente n'est pas supprimée, elle passe en inactif.
  // Tout se dérive donc des seules offres actives, sans quoi un pupitre retiré
  // ressusciterait au rechargement et un prix périmé pourrait ressortir.
  const actifs = work.products.filter((product) => product.isActive);

  const prix = (scope: string, coverage: string) =>
    toEuros(
      actifs.find(
        (product) => product.scope === scope && product.coverage === coverage,
      )?.priceCents,
    );

  const voiceCodes = [
    ...new Set(
      actifs
        .filter((product) => product.voice !== null)
        .map((product) => product.voice!.code),
    ),
  ];

  return {
    title: work.title,
    composer: work.composer,
    slug: work.slug,
    catalogueRef: work.catalogueRef,
    shortDescription: work.shortDescription ?? "",
    description: work.description ?? "",
    period: work.period,
    voicing: work.voicing,
    language: work.language as WorkFormDraft["language"],
    composedYear: work.composedYear,
    hasAccompaniment: work.hasAccompaniment,
    translations: {
      en: {
        slug: anglais?.slug ?? work.slug,
        title: anglais?.title ?? null,
        shortDescription: anglais?.shortDescription ?? null,
        description: anglais?.description ?? null,
      },
    },
    voiceCodes,
    movements: work.movements.map((movement) => ({
      key: movement.id,
      id: movement.id,
      title: movement.title,
    })),
    // La clé du mouvement vaut son id pour une ligne déjà enregistrée, les
    // cases s'y rattachent donc directement.
    tracks: work.movements.flatMap((movement) =>
      movement.audioFiles.map((piste) => ({
        movementKey: movement.id,
        voiceCode: piste.voice?.code ?? null,
        type: piste.type,
        state: { kind: "stored" as const, audioFileId: piste.id },
      })),
    ),
    prices: {
      movementSingleVoice: prix("MOVEMENT", "SINGLE_VOICE"),
      movementAllVoices: prix("MOVEMENT", "ALL_VOICES"),
      workSingleVoice: prix("WORK", "SINGLE_VOICE") ?? 0,
      workAllVoices: prix("WORK", "ALL_VOICES") ?? 0,
    },
  };
}
