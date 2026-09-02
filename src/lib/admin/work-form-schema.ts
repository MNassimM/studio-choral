import { z } from "zod";

/**
 * Schéma du formulaire d'oeuvre. Validation des champs etc.
 */

/** Un slug d'URL, en minuscules, sans accent ni espace. (généré automatiquement mais modifiable par l'admin) */
const slugSchema = z
  .string()
  .min(1, "Le slug est obligatoire.")
  .max(120)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Le slug ne peut contenir que des minuscules, des chiffres et des tirets.",
  );

/** Un prix saisi en euros, converti en centimes pour le stockage. */
const priceSchema = z
  .number({ message: "Ce prix est obligatoire." })
  .positive("Un prix doit être supérieur à zéro.")
  .max(999, "Ce prix dépasse la limite autorisée.")
  .multipleOf(0.01, "Un prix ne peut pas avoir plus de deux décimales.");

/**
 * Textes propres à une langue.
 *
 * @remarks
 * Titre facultatif, description et accroche obligatoires. Le slug est généré automatiquement à partir du titre mais peut être modifié par l'admin.
 */
const translationSchema = z.object({
  slug: slugSchema,
  title: z.string().max(200).nullable(),
  shortDescription: z
    .string()
    .min(1, "L'accroche est obligatoire.")
    .max(300),
  description: z.string().min(1, "La description est obligatoire.").max(5000),
});

/**
 * Un mouvement de l'oeuvre.
 */
const movementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Le titre du mouvement est obligatoire.").max(200),
});

export const workFormSchema = z
  .object({
    title: z.string().min(1, "Le titre est obligatoire.").max(200),
    composer: z.string().min(1, "Le compositeur est obligatoire.").max(200),
    catalogueRef: z.string().max(50).nullable(),
    period: z.string().min(1, "La période est obligatoire."),
    voicing: z.string().min(1, "L'effectif est obligatoire.").max(50),
    language: z.string().nullable(),
    slug: slugSchema,

    translations: z.object({
      fr: translationSchema,
      en: translationSchema,
    }),

    voiceCodes: z
      .array(z.string())
      .min(1, "Une œuvre doit avoir au moins un pupitre.")
      .refine(
        (codes) => new Set(codes).size === codes.length,
        "Un même pupitre ne peut pas être ajouté deux fois.",
      ),

    movements: z
      .array(movementSchema)
      .min(1, "Une œuvre doit avoir au moins un mouvement."),

    prices: z.object({
      movementSingleVoice: priceSchema,
      movementAllVoices: priceSchema,
      workSingleVoice: priceSchema,
      workAllVoices: priceSchema,
    }),
  })
  .refine(
    (work) => work.prices.movementAllVoices > work.prices.movementSingleVoice,
    {
      message:
        "Le pack toutes voix doit coûter plus cher qu'une voix seule.",
      path: ["prices", "movementAllVoices"],
    },
  )
  .refine((work) => work.prices.workSingleVoice > work.prices.movementSingleVoice, {
    message:
      "Une voix sur l'œuvre entière doit coûter plus cher que sur un seul mouvement.",
    path: ["prices", "workSingleVoice"],
  })
  .refine((work) => work.prices.workAllVoices > work.prices.workSingleVoice, {
    message:
      "Le pack complet doit coûter plus cher qu'une voix sur l'œuvre entière.",
    path: ["prices", "workAllVoices"],
  })
  .refine(
    (work) =>
      new Set(work.movements.map((movement) => movement.title)).size ===
      work.movements.length,
    {
      message: "Deux mouvements ne peuvent pas porter le même titre.",
      path: ["movements"],
    },
  );

export type WorkFormValues = z.infer<typeof workFormSchema>;