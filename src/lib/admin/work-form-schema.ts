import { z } from "zod";

import { MusicalPeriod } from "@/generated/prisma/enums";
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
  workSingleVoice: priceSchema,
  workAllVoices: priceSchema,
});

const baseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Le titre est obligatoire.")
    .max(200, "Ce titre est trop long."),
  composer: z
    .string()
    .trim()
    .min(1, "Le compositeur est obligatoire.")
    .max(200, "Ce nom de compositeur est trop long."),
  slug: slugSchema,
  catalogueRef: optionalText(50),
  shortDescription: z
    .string()
    .trim()
    .min(1, "L'accroche est obligatoire.")
    .max(300, "Cette accroche est trop longue."),
  description: z
    .string()
    .trim()
    .min(1, "La description est obligatoire.")
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
    .min(1, "Une œuvre doit avoir au moins un pupitre.")
    .refine(
      (codes) => new Set(codes).size === codes.length,
      "Un même pupitre ne peut pas être ajouté deux fois.",
    ),

  movements: z
    .array(movementSchema)
    .min(1, "Une œuvre doit avoir au moins un mouvement.")
    .max(60, "Une œuvre ne peut pas avoir autant de mouvements."),

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
  const workSingle = toCents(work.prices.workSingleVoice);
  const workAll = toCents(work.prices.workAllVoices);

  for (const champ of ["movementSingleVoice", "movementAllVoices"] as const) {
    const valeur = work.prices[champ];
    if (perMovement && valeur === null) {
      ctx.addIssue({
        code: "custom",
        message:
          "Ce prix est obligatoire dès que l'œuvre a plusieurs mouvements.",
        path: ["prices", champ],
      });
    }
    if (!perMovement && valeur !== null) {
      ctx.addIssue({
        code: "custom",
        message:
          "Une œuvre à mouvement unique ne se vend pas au mouvement, laissez ce prix vide.",
        path: ["prices", champ],
      });
    }
  }

  if (workAll <= workSingle) {
    ctx.addIssue({
      code: "custom",
      message:
        "Le pack complet doit coûter plus cher qu'une voix sur l'œuvre entière.",
      path: ["prices", "workAllVoices"],
    });
  }
  if (workAll >= workSingle * voiceCount) {
    ctx.addIssue({
      code: "custom",
      message: `Le pack complet doit coûter moins que les ${voiceCount} pupitres pris séparément.`,
      path: ["prices", "workAllVoices"],
    });
  }

  if (movementSingleVoice === null || movementAllVoices === null) return;

  const mvtSingle = toCents(movementSingleVoice);
  const mvtAll = toCents(movementAllVoices);

  if (mvtAll <= mvtSingle) {
    ctx.addIssue({
      code: "custom",
      message: "Le pack toutes voix doit coûter plus cher qu'une voix seule.",
      path: ["prices", "movementAllVoices"],
    });
  }
  if (mvtAll >= mvtSingle * voiceCount) {
    ctx.addIssue({
      code: "custom",
      message: `Le pack d'un mouvement doit coûter moins que les ${voiceCount} pupitres pris séparément.`,
      path: ["prices", "movementAllVoices"],
    });
  }
  if (workSingle <= mvtSingle) {
    ctx.addIssue({
      code: "custom",
      message:
        "Une voix sur l'œuvre entière doit coûter plus cher que sur un seul mouvement.",
      path: ["prices", "workSingleVoice"],
    });
  }
  if (workAll >= mvtAll * movementCount) {
    ctx.addIssue({
      code: "custom",
      message: `Le pack complet doit coûter moins que les ${movementCount} mouvements pris séparément.`,
      path: ["prices", "workAllVoices"],
    });
  }
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
});

export type WorkFormValues = z.infer<typeof workFormSchema>;
