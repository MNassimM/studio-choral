"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { MusicalPeriod } from "@/generated/prisma/enums";

import { requireAdmin } from "@/lib/admin/authorization";
import {
  workFormSchema,
  type WorkFormValues,
} from "@/lib/admin/work-form-schema";
import { prisma } from "@/lib/db/prisma";

/**
 * Actions d'administration du catalogue.
 */

type ActionResult =
  { ok: true; workId: string } | { ok: false; error: string; field?: string };

/** Convertit un prix saisi en euros vers des centimes entiers. */
function toCents(euros: number): number {
  return Math.round(euros * 100);
}

/** Transforme un titre en slug d'URL, sans accent ni ponctuation. */
function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Rend des slugs uniques dans une même oeuvre */
function uniqueSlugs(titles: string[]): string[] {
  const vus = new Map<string, number>();
  return titles.map((title, index) => {
    const base = slugify(title) || `mouvement-${index + 1}`;
    const dejaVu = vus.get(base) ?? 0;
    vus.set(base, dejaVu + 1);
    return dejaVu === 0 ? base : `${base}-${dejaVu + 1}`;
  });
}

/**
 * Vérifie que la période saisie fait partie de l'enum Prisma.
 */
function toMusicalPeriod(value: string): MusicalPeriod | null {
  return value in MusicalPeriod ? (value as MusicalPeriod) : null;
}

/**
 * Construit une référence produit unique et lisible.
 */
function buildSku(
  workSlug: string,
  movementPosition: number | null,
  voiceCode: string | null,
): string {
  const scope = movementPosition === null ? "WORK" : `MVT${movementPosition}`;
  const coverage = voiceCode ?? "ALL";
  return `${workSlug}-${scope}-${coverage}`.toUpperCase();
}

/**
 * Vérifie qu'aucune autre oeuvre n'occupe déjà ce slug, dans aucune langue.
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

/**
 * Fabrique la liste complète des produits d'une oeuvre à partir des deux prix saisis.
 */
function buildProductRows(
  workSlug: string,
  workTitle: string,
  movements: { id: string; position: number; title: string }[],
  voices: { id: string; code: string; label: string }[],
  prices: WorkFormValues["prices"],
) {
  const rows: Prisma.ProductCreateManyWorkInput[] = [];
  let position = 0;

  for (const movement of movements) {
    for (const voice of voices) {
      rows.push({
        sku: buildSku(workSlug, movement.position, voice.code),
        name: `${voice.label} - ${movement.title}`,
        scope: "MOVEMENT",
        coverage: "SINGLE_VOICE",
        movementId: movement.id,
        voiceId: voice.id,
        priceCents: toCents(prices.movementSingleVoice),
        currency: "EUR",
        isActive: true,
        position: position++,
      });
    }
    rows.push({
      sku: buildSku(workSlug, movement.position, null),
      name: `Toutes les voix - ${movement.title}`,
      scope: "MOVEMENT",
      coverage: "ALL_VOICES",
      movementId: movement.id,
      voiceId: null,
      priceCents: toCents(prices.movementAllVoices),
      currency: "EUR",
      isActive: true,
      position: position++,
    });
  }

  for (const voice of voices) {
    rows.push({
      sku: buildSku(workSlug, null, voice.code),
      name: `${voice.label} - ${workTitle}`,
      scope: "WORK",
      coverage: "SINGLE_VOICE",
      movementId: null,
      voiceId: voice.id,
      priceCents: toCents(prices.workSingleVoice),
      currency: "EUR",
      isActive: true,
      position: position++,
    });
  }

  rows.push({
    sku: buildSku(workSlug, null, null),
    name: `Toutes les voix - ${workTitle}`,
    scope: "WORK",
    coverage: "ALL_VOICES",
    movementId: null,
    voiceId: null,
    priceCents: toCents(prices.workAllVoices),
    currency: "EUR",
    isActive: true,
    position: position++,
  });

  return rows;
}

/** Retrouve les pupitres à partir de leurs codes, en préservant l'ordre saisi. */
async function resolveVoices(codes: string[]) {
  const voices = await prisma.voice.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true, label: true },
  });

  if (voices.length !== codes.length) {
    const found = new Set(voices.map((voice) => voice.code));
    const missing = codes.filter((code) => !found.has(code));
    throw new Error(`Pupitres inconnus : ${missing.join(", ")}.`);
  }

  return codes.map((code) => voices.find((voice) => voice.code === code)!);
}

/**
 * Crée une oeuvre complète, en brouillon.
 */
export async function createWork(input: WorkFormValues): Promise<ActionResult> {
  await requireAdmin();

  const parsed = workFormSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue.message,
      field: issue.path.join("."),
    };
  }
  const data = parsed.data;

  const period = toMusicalPeriod(data.period);
  if (!period) {
    return { ok: false, error: "Période musicale inconnue.", field: "period" };
  }

  for (const slug of [data.slug, data.translations.en.slug]) {
    if (await isSlugTaken(slug)) {
      return {
        ok: false,
        error: `Le slug ${slug} est déjà utilisé.`,
        field: "slug",
      };
    }
  }

  try {
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
          period,
          voicing: data.voicing,
          language: data.language,
          shortDescription: data.translations.fr.shortDescription,
          description: data.translations.fr.description,
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
          movements: { select: { id: true, position: true, title: true } },
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

    revalidatePath("/admin/works");
    return { ok: true, workId: work.id };
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: reason };
  }
}

/**
 * Met à jour une oeuvre existante.
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

  const period = toMusicalPeriod(data.period);
  if (!period) {
    return { ok: false, error: "Période musicale inconnue.", field: "period" };
  }

  for (const slug of [data.slug, data.translations.en.slug]) {
    if (await isSlugTaken(slug, workId)) {
      return {
        ok: false,
        error: `Le slug ${slug} est déjà utilisé.`,
        field: "slug",
      };
    }
  }

  try {
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
          period,
          voicing: data.voicing,
          language: data.language,
          shortDescription: data.translations.fr.shortDescription,
          description: data.translations.fr.description,
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

      await tx.movement.deleteMany({
        where: { workId, id: { notIn: keptIds } },
      });

      // On gare les positions et slugs hors de portée avant de les réattribuer,
      // sinon un simple échange viole les contraintes uniques de la table.
      for (const [index, id] of keptIds.entries()) {
        await tx.movement.update({
          where: { id },
          data: { position: -1 - index, slug: `tmp-${index}-${id}` },
        });
      }

      for (const [index, movement] of data.movements.entries()) {
        if (movement.id) {
          await tx.movement.update({
            where: { id: movement.id },
            data: {
              slug: movementSlugs[index],
              title: movement.title,
              position: index,
            },
          });
        } else {
          await tx.movement.create({
            data: {
              workId,
              slug: movementSlugs[index],
              title: movement.title,
              position: index,
            },
          });
        }
      }

      const movements = await tx.movement.findMany({
        where: { workId },
        select: { id: true, position: true, title: true },
        orderBy: { position: "asc" },
      });

      const rows = buildProductRows(
        data.slug,
        data.title,
        movements,
        voices,
        data.prices,
      );
      const wantedSkus = new Set(rows.map((row) => row.sku));

      await tx.product.updateMany({
        where: { workId, sku: { notIn: [...wantedSkus] } },
        data: { isActive: false },
      });

      // L'identité d'un produit, ce sont ses coordonnées, pas sa référence :
      // la référence suit le slug et change quand on renomme l'oeuvre.
      for (const row of rows) {
        const existing = await tx.product.findFirst({
          where: {
            workId,
            movementId: row.movementId ?? null,
            voiceId: row.voiceId ?? null,
            coverage: row.coverage,
          },
          select: { id: true },
        });

        if (existing) {
          await tx.product.update({
            where: { id: existing.id },
            data: {
              sku: row.sku,
              name: row.name,
              priceCents: row.priceCents,
              position: row.position,
              isActive: true,
            },
          });
        } else {
          await tx.product.create({
            data: {
              ...row,
              workId,
            },
          });
        }
      }
    });

    revalidatePath("/admin/works");
    revalidatePath(`/oeuvres/${data.slug}`);
    return { ok: true, workId };
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, error: reason };
  }
}

/**
 * Publie une oeuvre, après vérification qu'elle est complète.
 */
export async function publishWork(workId: string): Promise<ActionResult> {
  await requireAdmin();

  const work = await prisma.work.findUnique({
    where: { id: workId },
    include: {
      movements: { include: { audioFiles: { select: { id: true } } } },
      translations: { where: { locale: "en" }, select: { id: true } },
    },
  });

  if (!work) return { ok: false, error: "Œuvre introuvable." };

  if (work.translations.length === 0) {
    return { ok: false, error: "La traduction anglaise est incomplète." };
  }

  const emptyMovements = work.movements.filter(
    (movement) => movement.audioFiles.length === 0,
  );
  if (emptyMovements.length > 0) {
    return {
      ok: false,
      error: `Aucune piste audio pour : ${emptyMovements
        .map((movement) => movement.title)
        .join(", ")}.`,
    };
  }

  await prisma.work.update({
    where: { id: workId },
    data: { isPublished: true },
  });

  revalidatePath("/admin/works");
  revalidatePath("/catalogue");
  return { ok: true, workId };
}

/**
 * Retire une oeuvre du catalogue public.
 */
export async function unpublishWork(workId: string): Promise<ActionResult> {
  await requireAdmin();

  await prisma.work.update({
    where: { id: workId },
    data: { isPublished: false },
  });

  revalidatePath("/admin/works");
  revalidatePath("/catalogue");
  return { ok: true, workId };
}
