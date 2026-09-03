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
export type MovementDraft = WorkFormInput["movements"][number] & {
  key: string;
};

/**
 * Ce que le formulaire tient en mémoire.
 */
export type WorkFormDraft = Omit<WorkFormInput, "movements"> & {
  movements: MovementDraft[];
};

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
    movements: [],
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
  return {
    ...draft,
    movements: draft.movements.map(({ key, ...movement }) => {
      void key;
      return movement;
    }),
  } as WorkFormValues;
}
