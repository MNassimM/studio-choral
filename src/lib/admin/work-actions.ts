"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin/authorization";
import {
  workFormSchema,
  type WorkFormValues,
} from "@/lib/admin/work-form-schema";
import {
  buildProductRows,
  productKey,
  uniqueSlugs,
  type VoiceRow,
} from "@/lib/admin/work-products";
import { prisma } from "@/lib/db/prisma";

/**
 * Actions d'administration du catalogue.
 */

type ActionResult =
  { ok: true; workId: string } | { ok: false; error: string; field?: string };

/** Une erreur dont le message est déjà rédigé pour l'administrateur. */
class ActionError extends Error {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}

/**
 * Vérifie qu'aucune autre oeuvre n'occupe déjà ce slug.
 */
async function isSlugTaken(
  slug: string,
  excludeWorkId?: string,
): Promise<boolean> {
  const work = await prisma.work.findFirst({
    where: { slug, ...(excludeWorkId ? { id: { not: excludeWorkId } } : {}) },
    select: { id: true },
  });
  if (work) return true;

  const translation = await prisma.workTranslation.findFirst({
    where: {
      slug,
      ...(excludeWorkId ? { workId: { not: excludeWorkId } } : {}),
    },
    select: { id: true },
  });
  return translation !== null;
}

/** Retrouve les pupitres depuis leurs codes, en gardant l'ordre saisi. */
async function resolveVoices(codes: string[]): Promise<VoiceRow[]> {
  const voices = await prisma.voice.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true, label: true },
  });

  if (voices.length !== codes.length) {
    const trouves = new Set(voices.map((voice) => voice.code));
    const manquants = codes.filter((code) => !trouves.has(code));
    throw new ActionError(
      `Pupitres inconnus : ${manquants.join(", ")}.`,
      "voiceCodes",
    );
  }

  return codes.map((code) => voices.find((voice) => voice.code === code)!);
}

/**
 * Force la régénération des pages du catalogue et des oeuvres.
 */
function revalidateCatalog(): void {
  revalidatePath("/[locale]/admin/works", "page");
  revalidatePath("/[locale]/catalogue", "page");
  revalidatePath("/[locale]/works/[slug]", "page");
}

/** Traduit une erreur en résultat lisible, sans laisser fuir Prisma. */
function toFailure(cause: unknown): ActionResult {
  if (cause instanceof ActionError) {
    return { ok: false, error: cause.message, field: cause.field };
  }

  if (
    cause instanceof Prisma.PrismaClientKnownRequestError &&
    cause.code === "P2002"
  ) {
    const cibles = Array.isArray(cause.meta?.target)
      ? (cause.meta.target as string[])
      : [];
    if (cibles.some((cible) => cible.includes("slug"))) {
      return { ok: false, error: "Ce slug est déjà utilisé.", field: "slug" };
    }
    return { ok: false, error: "Cette valeur est déjà utilisée." };
  }

  console.error("work-actions", cause);
  return { ok: false, error: "L'enregistrement a échoué." };
}

/**
 * Crée une oeuvre complète, toujours en brouillon.
 *
 * @param input - Valeurs du formulaire, encore non validées.
 * @returns L'identifiant de l'oeuvre créée, ou l'erreur à afficher.
 */
export async function createWork(input: WorkFormValues): Promise<ActionResult> {
  await requireAdmin();

  const parsed = workFormSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: issue.path.join(".") };
  }
  const data = parsed.data;

  try {
    for (const slug of [data.slug, data.translations.en.slug]) {
      if (await isSlugTaken(slug)) {
        throw new ActionError(`Le slug ${slug} est déjà utilisé.`, "slug");
      }
    }

    const voices = await resolveVoices(data.voiceCodes);
    const movementSlugs = uniqueSlugs(
      data.movements.map((movement) => movement.title),
    );

    const work = await prisma.$transaction(async (tx) => {
      const created = await tx.work.create({
        data: {
          slug: data.slug,
          title: data.title,
          composer: data.composer,
          catalogueRef: data.catalogueRef,
          shortDescription: data.shortDescription,
          description: data.description,
          period: data.period,
          voicing: data.voicing,
          language: data.language,
          composedYear: data.composedYear,
          hasAccompaniment: data.hasAccompaniment,
          isPublished: false,
          translations: {
            create: [
              {
                locale: "en",
                slug: data.translations.en.slug,
                title: data.translations.en.title,
                shortDescription: data.translations.en.shortDescription,
                description: data.translations.en.description,
              },
            ],
          },
          movements: {
            create: data.movements.map((movement, index) => ({
              slug: movementSlugs[index],
              title: movement.title,
              position: index,
            })),
          },
        },
        include: {
          movements: { select: { id: true, slug: true, title: true } },
        },
      });

      await tx.product.createMany({
        data: buildProductRows(
          created.slug,
          created.title,
          created.movements,
          voices,
          data.prices,
        ).map((row) => ({ ...row, workId: created.id })),
      });

      return created;
    });

    revalidateCatalog();
    return { ok: true, workId: work.id };
  } catch (cause) {
    return toFailure(cause);
  }
}

/**
 * Met à jour une oeuvre existante, sans jamais toucher aux références produit.
 *
 * @param workId - Oeuvre à modifier.
 * @param input - Valeurs du formulaire encore non validées.
 * @returns L'identifiant de l'oeuvre ou l'erreur à afficher.
 */
export async function updateWork(
  workId: string,
  input: WorkFormValues,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = workFormSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: issue.path.join(".") };
  }
  const data = parsed.data;

  try {
    for (const slug of [data.slug, data.translations.en.slug]) {
      if (await isSlugTaken(slug, workId)) {
        throw new ActionError(`Le slug ${slug} est déjà utilisé.`, "slug");
      }
    }

    const voices = await resolveVoices(data.voiceCodes);
    const movementSlugs = uniqueSlugs(
      data.movements.map((movement) => movement.title),
    );

    await prisma.$transaction(async (tx) => {
      await tx.work.update({
        where: { id: workId },
        data: {
          slug: data.slug,
          title: data.title,
          composer: data.composer,
          catalogueRef: data.catalogueRef,
          shortDescription: data.shortDescription,
          description: data.description,
          period: data.period,
          voicing: data.voicing,
          language: data.language,
          composedYear: data.composedYear,
          hasAccompaniment: data.hasAccompaniment,
        },
      });

      await tx.workTranslation.upsert({
        where: { workId_locale: { workId, locale: "en" } },
        create: {
          workId,
          locale: "en",
          slug: data.translations.en.slug,
          title: data.translations.en.title,
          shortDescription: data.translations.en.shortDescription,
          description: data.translations.en.description,
        },
        update: {
          slug: data.translations.en.slug,
          title: data.translations.en.title,
          shortDescription: data.translations.en.shortDescription,
          description: data.translations.en.description,
        },
      });

      const keptIds = data.movements
        .map((movement) => movement.id)
        .filter((id): id is string => Boolean(id));

      const doomed = await tx.movement.findMany({
        where: { workId, id: { notIn: keptIds } },
        select: { id: true, title: true },
      });

      if (doomed.length > 0) {
        const vendus = await tx.libraryItem.findMany({
          where: { movementId: { in: doomed.map((movement) => movement.id) } },
          select: { movementId: true },
          distinct: ["movementId"],
        });

        if (vendus.length > 0) {
          const bloques = new Set(vendus.map((item) => item.movementId));
          const titres = doomed
            .filter((movement) => bloques.has(movement.id))
            .map((movement) => movement.title);
          throw new ActionError(
            `Ces mouvements ont déjà été vendus et ne peuvent pas être supprimés : ${titres.join(", ")}.`,
            "movements",
          );
        }

        await tx.movement.deleteMany({
          where: { id: { in: doomed.map((movement) => movement.id) } },
        });
      }

      for (const [index, id] of keptIds.entries()) {
        await tx.movement.update({
          where: { id },
          data: { position: -1 - index, slug: `tmp-${index}-${id}` },
        });
      }

      for (const [index, movement] of data.movements.entries()) {
        const valeurs = {
          slug: movementSlugs[index],
          title: movement.title,
          position: index,
        };

        if (movement.id) {
          await tx.movement.update({
            where: { id: movement.id },
            data: valeurs,
          });
        } else {
          await tx.movement.create({ data: { workId, ...valeurs } });
        }
      }

      const movements = await tx.movement.findMany({
        where: { workId },
        select: { id: true, slug: true, title: true },
        orderBy: { position: "asc" },
      });

      const rows = buildProductRows(
        data.slug,
        data.title,
        movements,
        voices,
        data.prices,
      );

      const existants = await tx.product.findMany({
        where: { workId },
        select: { id: true, movementId: true, voiceId: true, coverage: true },
      });
      const parCoordonnees = new Map(
        existants.map((product) => [
          productKey(product.movementId, product.voiceId, product.coverage),
          product.id,
        ]),
      );
      const voulus = new Set(
        rows.map((row) =>
          productKey(row.movementId ?? null, row.voiceId ?? null, row.coverage),
        ),
      );

      const perimes = existants
        .filter(
          (product) =>
            !voulus.has(
              productKey(product.movementId, product.voiceId, product.coverage),
            ),
        )
        .map((product) => product.id);

      if (perimes.length > 0) {
        await tx.product.updateMany({
          where: { id: { in: perimes } },
          data: { isActive: false },
        });
      }

      for (const row of rows) {
        const existant = parCoordonnees.get(
          productKey(row.movementId ?? null, row.voiceId ?? null, row.coverage),
        );

        if (existant) {
          await tx.product.update({
            where: { id: existant },
            data: {
              name: row.name,
              priceCents: row.priceCents,
              position: row.position,
              isActive: true,
            },
          });
        } else {
          await tx.product.create({ data: { ...row, workId } });
        }
      }
    });

    revalidateCatalog();
    return { ok: true, workId };
  } catch (cause) {
    return toFailure(cause);
  }
}

/**
 * Publie une oeuvre, après vérification qu'elle est complète.
 *
 * @param workId - Oeuvre à publier.
 * @returns L'identifiant de l'oeuvre, ou la raison du refus.
 */
export async function publishWork(workId: string): Promise<ActionResult> {
  await requireAdmin();

  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: {
      id: true,
      period: true,
      voicing: true,
      movements: {
        select: { title: true, _count: { select: { audioFiles: true } } },
        orderBy: { position: "asc" },
      },
      translations: {
        where: { locale: "en" },
        select: { shortDescription: true, description: true },
      },
      products: { where: { isActive: true }, select: { id: true } },
    },
  });

  if (!work) return { ok: false, error: "Œuvre introuvable." };

  if (work.period === null) {
    return {
      ok: false,
      error: "La période musicale est manquante.",
      field: "period",
    };
  }
  if (work.voicing === null) {
    return {
      ok: false,
      error: "La formation vocale est manquante.",
      field: "voicing",
    };
  }

  const anglais = work.translations[0];
  if (!anglais || !anglais.shortDescription || !anglais.description) {
    return {
      ok: false,
      error: "La traduction anglaise est incomplète.",
      field: "translations.en",
    };
  }

  if (work.movements.length === 0) {
    return {
      ok: false,
      error: "Cette œuvre n'a aucun mouvement.",
      field: "movements",
    };
  }

  const sansPiste = work.movements.filter(
    (movement) => movement._count.audioFiles === 0,
  );
  if (sansPiste.length > 0) {
    return {
      ok: false,
      error: `Aucune piste audio pour : ${sansPiste.map((movement) => movement.title).join(", ")}.`,
      field: "movements",
    };
  }

  if (work.products.length === 0) {
    return { ok: false, error: "Cette œuvre n'a aucune offre active." };
  }

  await prisma.work.update({
    where: { id: workId },
    data: { isPublished: true },
  });

  revalidateCatalog();
  return { ok: true, workId };
}

/**
 * Retire une oeuvre du catalogue public.
 *
 * @param workId - Oeuvre à dépublier.
 * @returns L'identifiant de l'oeuvre.
 */
export async function unpublishWork(workId: string): Promise<ActionResult> {
  await requireAdmin();

  await prisma.work.update({
    where: { id: workId },
    data: { isPublished: false },
  });

  revalidateCatalog();
  return { ok: true, workId };
}
