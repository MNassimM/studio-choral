import { z } from "zod";

import { AudioType, MusicalPeriod } from "@/generated/prisma/enums";
import type { AudioType as AudioTypeName } from "@/types/domain";
import { voicingSchema } from "@/lib/works/voicing";
import { isKnownWorkLanguageCode } from "@/lib/works/work-language";

/**
 * Schéma du formulaire d'ajout/modification d'oeuvre.
 */

/** Passe un prix en euros vers des centimes. */
export function toCents(euros: number): number {
  return Math.round(euros * 100);
}

/** Un slug d'URL, en minuscules, sans accent ni espace. */
const slugSchema = z
  .string()
  .min(1, "Le slug est obligatoire.")
  .max(120, "Ce slug est trop long.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Le slug ne peut contenir que des minuscules, des chiffres et des tirets.",
  );

/** Un prix saisi en euros, deux décimales au plus. */
const priceSchema = z
  .number({ message: "Ce prix est obligatoire." })
  .positive("Un prix doit être supérieur à zéro.")
  .max(999, "Ce prix dépasse la limite autorisée.")
  .multipleOf(0.01, "Un prix ne peut pas avoir plus de deux décimales.");

/** Un texte facultatif, où la case laissée vide vaut absence. */
function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, "Ce texte est trop long.")
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null));
}

/**
 * Les textes anglais, tous facultatifs à la création.
 */
const englishSchema = z.object({
  slug: slugSchema,
  title: optionalText(200),
  shortDescription: optionalText(300),
  description: optionalText(5000),
});

/** Un mouvement de l'oeuvre. L'identifiant n'existe qu'en modification. */
const movementSchema = z.object({
  /**
   * Clé client, stable dès l'ajout de la ligne. C'est par elle que les
   * pistes se rattachent, un mouvement neuf n'ayant pas encore d'id.
   */
  key: z.string().min(1),
  id: z.string().min(1).optional(),
  title: z
    .string()
    .trim()
    .min(1, "Le titre du mouvement est obligatoire.")
    .max(200, "Ce titre de mouvement est trop long."),
});

/**
 * Les quatre prix catalogue, en euros.
 */
const pricesSchema = z.object({
  movementSingleVoice: priceSchema.nullable(),
  movementAllVoices: priceSchema.nullable(),
  workSingleVoice: priceSchema.nullable(),
  workAllVoices: priceSchema.nullable(),
});

/** Les types de piste qui portent un pupitre. */
const PER_VOICE_AUDIO_TYPES: AudioTypeName[] = [
  "SOLO",
  "PREDOMINANT",
  "PREVIEW",
];

/**
 * Une case de la matrice audio, soit déjà en base, soit fraîchement déposée.
 */
const trackSchema = z.object({
  /** Rattachement par la clé du mouvement, jamais par son id. */
  movementKey: z.string().min(1),
  /** Code du pupitre, nul pour un tutti ou un accompagnement. */
  voiceCode: z.string().min(1).nullable(),
  type: z.enum(AudioType),
  state: z.discriminatedUnion("kind", [
    z.object({
      kind: z.literal("stored"),
      audioFileId: z.string().min(1),
    }),
    z.object({
      kind: z.literal("pending"),
      /** Identifiant du téléversement, qui recompose la clé sous pending. */
      uploadId: z.string().min(1),
      filename: z.string().min(1).max(255),
      sizeBytes: z.number().int().positive(),
      /** Mesurée dans le navigateur, revalidée ici. */
      durationSeconds: z.number().int().positive().max(7200),
      mimeType: z.string().min(1).max(100),
    }),
  ]),
});

/**
 * L'image de couverture, dans l'un de ses trois états.
 *
 * @remarks
 * Même motif que `trackSchema.state` : « stored » désigne une image déjà
 * rangée, dont on ne connaît que la clé ; « pending » une image déposée dans
 * le bucket public mais pas encore rattachée à l'oeuvre, l'identifiant de
 * celle-ci n'existant pas forcément au moment du dépôt.
 */
const coverSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({
    kind: z.literal("stored"),
    /** Clé dans le bucket public, telle qu'elle est en base. */
    key: z.string().min(1).max(1024),
  }),
  z.object({
    kind: z.literal("pending"),
    /** Identifiant du téléversement, qui recompose la clé sous pending. */
    uploadId: z.string().min(1).max(64),
    filename: z.string().min(1).max(255),
    sizeBytes: z.number().int().positive(),
    mimeType: z.string().min(1).max(100),
  }),
]);

const baseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Le titre est obligatoire.")
    .max(200, "Ce titre est trop long."),
  composer: z.string().trim().max(200, "Ce nom de compositeur est trop long."),
  slug: slugSchema,
  catalogueRef: optionalText(50),
  shortDescription: z
    .string()
    .trim()
    .max(300, "Cette accroche est trop longue."),
  description: z
    .string()
    .trim()
    .max(5000, "Cette description est trop longue."),

  period: z
    .enum(MusicalPeriod, { message: "Période musicale inconnue." })
    .nullable(),
  voicing: voicingSchema.nullable(),
  language: z
    .string()
    .trim()
    .refine(isKnownWorkLanguageCode, "Cette langue chantée n'a pas de libellé.")
    .nullable(),
  composedYear: z
    .number()
    .int("L'année doit être un nombre entier.")
    .min(800, "Cette année est hors des bornes admises.")
    .max(2200, "Cette année est hors des bornes admises.")
    .nullable(),
  hasAccompaniment: z.boolean(),

  translations: z.object({ en: englishSchema }),

  voiceCodes: z
    .array(z.string().min(1))
    .refine(
      (codes) => new Set(codes).size === codes.length,
      "Un même pupitre ne peut pas être ajouté deux fois.",
    ),

  movements: z
    .array(movementSchema)
    .max(60, "Une œuvre ne peut pas avoir autant de mouvements."),

  tracks: z.array(trackSchema).max(2000),

  /**
   * Par défaut « aucune image » : le champ est absent des brouillons plus
   * anciens, et une action serveur doit accepter ce qu'un navigateur pas
   * encore rechargé lui envoie.
   */
  cover: coverSchema.default({ kind: "none" }),

  prices: pricesSchema,
});

/**
 * Vérifie que les prix se tiennent entre eux.
 */
function checkPrices(work: z.infer<typeof baseSchema>, ctx: z.RefinementCtx) {
  const voiceCount = work.voiceCodes.length;
  const movementCount = work.movements.length;
  const perMovement = movementCount > 1;
  const { movementSingleVoice, movementAllVoices } = work.prices;
  // Un brouillon peut n'avoir aucun prix. On ne juge que ce qui est saisi,
  // publishWork se chargera d'exiger le reste.
  if (
    work.prices.workSingleVoice === null ||
    work.prices.workAllVoices === null
  ) {
    return;
  }
  const workSingle = toCents(work.prices.workSingleVoice);
  const workAll = toCents(work.prices.workAllVoices);

  for (const champ of ["movementSingleVoice", "movementAllVoices"] as const) {
    const valeur = work.prices[champ];
    if (!perMovement && valeur !== null) {
      ctx.addIssue({
        code: "custom",
        message:
          "Une œuvre à mouvement unique ne se vend pas au mouvement, laissez ce prix vide.",
        path: ["prices", champ],
      });
    }
  }

  // Égalité stricte, et non un encadrement : l'offre toutes voix ouvre
  // exactement les mêmes droits que ses pupitres réunis, elle doit donc coûter
  // exactement le même prix. Elle n'est qu'une façon d'acheter le tout d'un
  // seul geste, elle n'apporte aucun avantage à récompenser ni à facturer.
  if (voiceCount >= 1 && workAll !== workSingle * voiceCount) {
    ctx.addIssue({
      code: "custom",
      message: `Le pack complet doit coûter exactement les ${voiceCount} pupitres réunis, soit ${((workSingle * voiceCount) / 100).toFixed(2)} €.`,
      path: ["prices", "workAllVoices"],
    });
  }

  if (movementSingleVoice === null || movementAllVoices === null) return;

  const mvtSingle = toCents(movementSingleVoice);
  const mvtAll = toCents(movementAllVoices);

  if (voiceCount >= 1 && mvtAll !== mvtSingle * voiceCount) {
    ctx.addIssue({
      code: "custom",
      message: `Le pack d'un mouvement doit coûter exactement les ${voiceCount} pupitres réunis, soit ${((mvtSingle * voiceCount) / 100).toFixed(2)} €.`,
      path: ["prices", "movementAllVoices"],
    });
  }
  if (workSingle < mvtSingle) {
    ctx.addIssue({
      code: "custom",
      message:
        "Une voix sur l'œuvre entière ne peut pas coûter moins que sur un seul mouvement.",
      path: ["prices", "workSingleVoice"],
    });
  }
  if (workAll > mvtAll * movementCount) {
    ctx.addIssue({
      code: "custom",
      message: `Le pack complet ne peut pas coûter plus que les ${movementCount} mouvements pris séparément.`,
      path: ["prices", "workAllVoices"],
    });
  }
}

/**
 * Vérifie que les cases de la matrice se tiennent.
 */
function checkTracks(work: z.infer<typeof baseSchema>, ctx: z.RefinementCtx) {
  const vues = new Set<string>();

  work.tracks.forEach((track, index) => {
    // Les règles de cohérence de forme restent ici, rien d'autre ne les
    // rattrape. Celles qui portaient sur un mouvement supprimé ou un pupitre
    // retiré ont volontairement disparu : ce n'est plus un refus, updateWork
    // purge ces pistes et leurs fichiers.
    const parPupitre = PER_VOICE_AUDIO_TYPES.includes(track.type);
    if (parPupitre && track.voiceCode === null) {
      ctx.addIssue({
        code: "custom",
        message: `Une piste ${track.type} doit porter un pupitre.`,
        path: ["tracks", index],
      });
    }
    if (!parPupitre && track.voiceCode !== null) {
      ctx.addIssue({
        code: "custom",
        message: `Une piste ${track.type} ne porte pas de pupitre.`,
        path: ["tracks", index],
      });
    }

    const cellule = `${track.movementKey}|${track.voiceCode ?? ""}|${track.type}`;
    if (vues.has(cellule)) {
      ctx.addIssue({
        code: "custom",
        message: "Deux pistes visent la même case de la matrice.",
        path: ["tracks", index],
      });
    }
    vues.add(cellule);
  });
}

export const workFormSchema = baseSchema.superRefine((work, ctx) => {
  const titres = work.movements.map((movement) => movement.title);
  if (new Set(titres).size !== titres.length) {
    ctx.addIssue({
      code: "custom",
      message: "Deux mouvements ne peuvent pas porter le même titre.",
      path: ["movements"],
    });
  }

  checkPrices(work, ctx);
  checkTracks(work, ctx);
});

export type WorkFormValues = z.infer<typeof workFormSchema>;

/**
 * Déduit les trois prix dérivés du seul prix saisi.
 *
 * @remarks
 * Aucun coefficient nulle part : un prix se multiplie par ce qu'il couvre. Le
 * pack toutes voix vaut ses pupitres réunis, l'oeuvre entière vaut ses
 * mouvements réunis. Grouper un achat ne le remise pas, et ne le majore pas.
 *
 * @param source - Le prix saisi, en euros.
 * @param voiceCount - Nombre de pupitres retenus.
 * @param movementCount - Nombre de mouvements.
 * @returns Les quatre prix, ceux de mouvement nuls s'il n'y en a qu'un.
 */
export function derivePrices(
  source: number | null,
  voiceCount: number,
  movementCount: number,
): WorkFormValues["prices"] {
  const vide = {
    movementSingleVoice: null,
    movementAllVoices: null,
    workSingleVoice: 0,
    workAllVoices: 0,
  };
  if (source === null || !Number.isFinite(source) || source <= 0) return vide;
  if (voiceCount < 1 || movementCount < 1) return vide;

  const cents = toCents(source);
  const enEuros = (valeur: number) => Math.round(valeur) / 100;
  const toutesVoix = (unitaire: number) => Math.round(unitaire * voiceCount);

  if (movementCount === 1) {
    return {
      movementSingleVoice: null,
      movementAllVoices: null,
      workSingleVoice: enEuros(cents),
      workAllVoices: enEuros(toutesVoix(cents)),
    };
  }

  const oeuvreUneVoix = Math.round(cents * movementCount);
  return {
    movementSingleVoice: enEuros(cents),
    movementAllVoices: enEuros(toutesVoix(cents)),
    workSingleVoice: enEuros(oeuvreUneVoix),
    workAllVoices: enEuros(toutesVoix(oeuvreUneVoix)),
  };
}
