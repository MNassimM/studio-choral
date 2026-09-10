"use server";

import { requireAdmin } from "@/lib/admin/authorization";
import {
  summarizeMissingTracks,
  syncProductActivation,
  unpublishIfIncomplete,
} from "@/lib/admin/product-activation";
import {
  ActionError,
  toFailure,
  type ActionResult,
} from "@/lib/admin/work-action-errors";
import {
  workFormSchema,
  type WorkFormValues,
} from "@/lib/admin/work-form-schema";
import {
  planMovements,
  planProducts,
  planRetiredVoiceTracks,
} from "@/lib/admin/work-mutations";
import {
  buildProductRows,
  uniqueSlugs,
  type VoiceRow,
} from "@/lib/admin/work-products";
import { revalidateCatalog } from "@/lib/admin/work-revalidation";
import {
  deleteStoredObjects,
  storePendingTracks,
} from "@/lib/admin/work-track-storage";
import { prisma } from "@/lib/db/prisma";

/**
 * Actions d'administration du catalogue.
 *
 * @remarks
 * Orchestration seulement. Ce que l'on décide de changer se calcule dans
 * work-mutations, ce qui touche au stockage vit dans work-track-storage, et la
 * traduction des erreurs dans work-action-errors.
 */

/**
 * Vérifie qu'aucune autre oeuvre n'occupe déjà ce slug.
 *
 * @param slug - Slug à contrôler.
 * @param excludeWorkId - Oeuvre à ignorer, celle que l'on modifie.
 * @returns Vrai si le slug est déjà pris.
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
 * Retrouve les pupitres depuis leurs codes, en gardant l'ordre saisi.
 *
 * @param codes - Codes retenus par le brouillon.
 * @returns Les pupitres, dans l'ordre des codes reçus.
 */
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
          movements: {
            select: { id: true, slug: true, title: true },
            orderBy: { position: "asc" },
          },
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

    // Deuxième temps, hors transaction : les mouvements viennent d'être créés
    // dans l'ordre du brouillon, la clé du brouillon se relie donc par rang.
    const movementIdByKey = new Map(
      data.movements.map((movement, index) => [
        movement.key,
        work.movements[index].id,
      ]),
    );
    const voiceIdByCode = new Map(
      voices.map((voice) => [voice.code, voice.id]),
    );
    const range = await storePendingTracks(
      work.id,
      data.tracks,
      movementIdByKey,
      voiceIdByCode,
    );

    await syncProductActivation(work.id);
    await unpublishIfIncomplete(work.id);

    revalidateCatalog();
    if (range.failed.length > 0) {
      return {
        ok: false,
        error: `L'œuvre est enregistrée, mais ces pistes n'ont pas pu être rangées : ${range.failed.join(", ")}.`,
      };
    }
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

  // VALIDATION FORMULAIRE
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

    // Rempli dans la transaction, relu juste après pour ranger les pistes.
    let enregistres: { id: string; slug: string; title: string }[] = [];
    // Collectées dans la transaction, effacées seulement après son commit :
    // effacer pendant reviendrait, sur un retour arrière, à détruire des
    // fichiers dont la ligne survit.
    const aEffacer: string[] = [];

    // TRANSACTION : mise à jour de l'oeuvre, de ses traductions, de ses mouvements et de ses offres.
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

      // ── Mouvements ────────────────────────────────────────────────────────
      const mouvementsEnBase = await tx.movement.findMany({
        where: { workId },
        select: { id: true, title: true },
      });
      const plan = planMovements(
        mouvementsEnBase,
        data.movements,
        movementSlugs,
      );

      if (plan.doomed.length > 0) {
        const doomedIds = plan.doomed.map((movement) => movement.id);

        const vendus = await tx.libraryItem.findMany({
          where: { movementId: { in: doomedIds } },
          select: { movementId: true },
          distinct: ["movementId"],
        });

        if (vendus.length > 0) {
          const bloques = new Set(vendus.map((item) => item.movementId));
          const titres = plan.doomed
            .filter((movement) => bloques.has(movement.id))
            .map((movement) => movement.title);
          throw new ActionError(
            `Ces mouvements ont déjà été vendus et ne peuvent pas être supprimés : ${titres.join(", ")}.`,
            "movements",
          );
        }

        // Les AudioFile partent en cascade avec le mouvement, mais pas les
        // objets R2, qui sont sous works et non sous pending : la règle de
        // cycle de vie ne les ramasserait jamais. On relève leurs clés tant
        // que les lignes existent, l'effacement a lieu après le commit.
        const orphelins = await tx.audioFile.findMany({
          where: { movementId: { in: doomedIds } },
          select: { storageKey: true },
        });
        aEffacer.push(...orphelins.map((piste) => piste.storageKey));

        await tx.movement.deleteMany({ where: { id: { in: doomedIds } } });
      }

      for (const etape of plan.parking) {
        await tx.movement.update({
          where: { id: etape.id },
          data: { position: etape.position, slug: etape.slug },
        });
      }
      for (const { id, ...valeurs } of plan.updates) {
        await tx.movement.update({ where: { id }, data: valeurs });
      }
      for (const creation of plan.creations) {
        await tx.movement.create({ data: { workId, ...creation } });
      }

      enregistres = await tx.movement.findMany({
        where: { workId },
        select: { id: true, slug: true, title: true },
        orderBy: { position: "asc" },
      });

      // ── Offres ────────────────────────────────────────────────────────────
      const offresEnBase = await tx.product.findMany({
        where: { workId },
        select: { id: true, movementId: true, voiceId: true, coverage: true },
      });
      const planOffres = planProducts(
        offresEnBase,
        buildProductRows(
          data.slug,
          data.title,
          enregistres,
          voices,
          data.prices,
        ),
      );

      if (planOffres.retiredIds.length > 0) {
        // Retirée du catalogue, ce qui n'est pas la même chose qu'incomplète :
        // elle sort de tous les calculs, mais la ligne reste pour l'historique.
        await tx.product.updateMany({
          where: { id: { in: planOffres.retiredIds } },
          data: { isActive: false, isRetired: true },
        });
      }
      for (const offre of planOffres.updates) {
        await tx.product.update({
          where: { id: offre.id },
          data: {
            name: offre.name,
            priceCents: offre.priceCents,
            position: offre.position,
            // Elle est de nouveau engendrée, elle n'est donc plus retirée.
            // isActive sera tranché par la synchronisation, sur les pistes.
            isRetired: false,
          },
        });
      }
      for (const creation of planOffres.creations) {
        await tx.product.create({ data: { ...creation, workId } });
      }

      // ── Pistes d'un pupitre retiré ────────────────────────────────────────
      const pistesEnBase = await tx.audioFile.findMany({
        where: { movement: { workId } },
        select: { id: true, storageKey: true, voiceId: true },
      });
      const purge = planRetiredVoiceTracks(
        pistesEnBase,
        voices.map((voice) => voice.id),
      );

      if (purge.doomed.length > 0) {
        // Même garde que pour un mouvement supprimé : on ne détruit pas le
        // fichier d'un pupitre que quelqu'un a déjà payé.
        const vendus = await tx.libraryItem.findMany({
          where: { workId, voiceId: { in: purge.voiceIds } },
          select: { voice: { select: { label: true } } },
          distinct: ["voiceId"],
        });

        if (vendus.length > 0) {
          const libelles = vendus.map((item) => item.voice?.label ?? "inconnu");
          throw new ActionError(
            `Ces pupitres ont déjà été vendus et ne peuvent pas être retirés : ${libelles.join(", ")}.`,
            "voiceCodes",
          );
        }

        aEffacer.push(...purge.doomed.map((piste) => piste.storageKey));
        await tx.audioFile.deleteMany({
          where: { id: { in: purge.doomed.map((piste) => piste.id) } },
        });
      }
    });

    // Les fichiers partent maintenant que la base a commité.
    const objetsNonSupprimes = await deleteStoredObjects(aEffacer);

    // Deuxième temps, hors transaction. Les mouvements sont triés par
    // position, comme le brouillon, la clé se relie donc par rang.
    const movementIdByKey = new Map(
      data.movements.map((movement, index) => [
        movement.key,
        enregistres[index].id,
      ]),
    );
    const voiceIdByCode = new Map(
      voices.map((voice) => [voice.code, voice.id]),
    );
    const range = await storePendingTracks(
      workId,
      data.tracks,
      movementIdByKey,
      voiceIdByCode,
    );

    await syncProductActivation(workId);
    const depubliee = await unpublishIfIncomplete(workId);
    revalidateCatalog();

    if (depubliee) {
      return {
        ok: false,
        error:
          "L'œuvre est enregistrée, mais elle a été dépubliée : toutes ses offres ne sont pas couvertes par des pistes audio. Les personnes l'ayant déjà achetée gardent leur accès.",
      };
    }
    if (range.failed.length > 0) {
      return {
        ok: false,
        error: `L'œuvre est enregistrée, mais ces pistes n'ont pas pu être rangées : ${range.failed.join(", ")}.`,
      };
    }
    if (objetsNonSupprimes > 0) {
      return {
        ok: false,
        error: `L'œuvre est enregistrée, mais ${objetsNonSupprimes} fichier(s) audio n'ont pas pu être supprimés du stockage.`,
      };
    }
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
      title: true,
      composer: true,
      shortDescription: true,
      description: true,
      movements: { select: { id: true }, orderBy: { position: "asc" } },
      translations: {
        where: { locale: "en" },
        select: { shortDescription: true, description: true },
      },
    },
  });

  if (!work) return { ok: false, error: "Œuvre introuvable." };

  const vides = [
    !work.title.trim() && "le titre",
    !work.composer.trim() && "le compositeur",
    !work.shortDescription?.trim() && "l'accroche",
    !work.description?.trim() && "la description",
  ].filter((champ): champ is string => Boolean(champ));
  if (vides.length > 0) {
    return {
      ok: false,
      error: `Publication impossible, il manque ${vides.join(", ")}.`,
    };
  }

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

  // L'activation est recalculée avant de juger, sans quoi on publierait sur
  // un état périmé si des pistes ont bougé depuis le dernier enregistrement.
  await syncProductActivation(workId);
  const manquantes = await summarizeMissingTracks(workId);

  if (manquantes.incompleteProducts > 0) {
    return {
      ok: false,
      error: `Publication impossible : ${manquantes.incompleteProducts} offre(s) sont incomplètes faute de pistes audio.`,
      field: "movements",
    };
  }

  const actives = await prisma.product.count({
    where: { workId, isActive: true, isRetired: false },
  });
  if (actives === 0) {
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
 * Supprime une oeuvre, à condition que personne n'y ait jamais eu accès.
 *
 * @remarks
 * Les clés sont relevées avant la suppression, que la cascade emporterait,
 * mais les objets ne partent qu'APRÈS elle : même règle que dans updateWork,
 * un objet resté en trop se rattrape, un fichier détruit à tort non.
 *
 * @param workId - Oeuvre à supprimer.
 * @returns L'identifiant de l'oeuvre, ou la raison du refus.
 */
export async function deleteWork(workId: string): Promise<ActionResult> {
  await requireAdmin();

  const work = await prisma.work.findUnique({
    where: { id: workId },
    select: { title: true, _count: { select: { libraryItems: true } } },
  });

  if (!work) return { ok: false, error: "Œuvre introuvable." };

  if (work._count.libraryItems > 0) {
    return {
      ok: false,
      error: `${work.title} compte ${work._count.libraryItems} accès accordé${work._count.libraryItems > 1 ? "s" : ""}. Dépubliez la plutôt que de la supprimer, un accès payé ne doit jamais disparaître.`,
    };
  }

  const pistes = await prisma.audioFile.findMany({
    where: { movement: { workId } },
    select: { storageKey: true },
  });

  await prisma.work.delete({ where: { id: workId } });

  const objetsNonSupprimes = await deleteStoredObjects(
    pistes.map((piste) => piste.storageKey),
  );
  if (objetsNonSupprimes > 0) {
    console.error(
      `work-actions deleteWork : ${objetsNonSupprimes} objet(s) restés en place sur ${pistes.length}.`,
    );
  }

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
