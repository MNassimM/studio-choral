"use server";

import { revalidatePath } from "next/cache";

import { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/admin/authorization";
import {
  summarizeMissingTracks,
  syncProductActivation,
  unpublishIfIncomplete,
} from "@/lib/admin/product-activation";
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
import {
  buildPendingKey,
  buildTrackKey,
  extensionOf,
  storage,
} from "@/lib/storage/storage";
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
 * Range les pistes fraîchement déposées, après le commit de l'oeuvre.
 *
 * @remarks
 * Hors transaction volontairement : déplacer quatre-vingts objets dépasserait
 * de loin le délai de cinq secondes d'une transaction interactive. La clé
 * source se reconstruit ici, jamais reçue du client, et la clé définitive
 * étant déterministe, un objet resté en rade sera écrasé au prochain
 * enregistrement de la même case.
 *
 * @param workId - Oeuvre concernée.
 * @param tracks - Les cases du brouillon.
 * @param movementIdByKey - Correspondance entre clé de mouvement et id.
 * @param voiceIdByCode - Correspondance entre code de pupitre et id.
 * @returns Le nombre de pistes rangées et celles qui ont échoué.
 */
async function storePendingTracks(
  workId: string,
  tracks: WorkFormValues["tracks"],
  movementIdByKey: Map<string, string>,
  voiceIdByCode: Map<string, string>,
): Promise<{ stored: number; failed: string[] }> {
  const attente = tracks.filter((track) => track.state.kind === "pending");
  const failed: string[] = [];
  let stored = 0;

  for (const track of attente) {
    if (track.state.kind !== "pending") continue;
    const movementId = movementIdByKey.get(track.movementKey);
    // undefined et non null : il faut distinguer « cette piste n'a pas de
    // pupitre », qui est normal pour un tutti, de « son pupitre n'est plus
    // retenu ». Retomber sur null écrirait une piste commune dont la clé de
    // stockage porterait pourtant un code de pupitre.
    const voiceId = track.voiceCode ? voiceIdByCode.get(track.voiceCode) : null;
    const extension = extensionOf(track.state.filename);

    if (!movementId || voiceId === undefined || extension === null) {
      failed.push(track.state.filename);
      continue;
    }

    const source = buildPendingKey(track.state.uploadId, track.state.filename);
    const cible = buildTrackKey({
      workId,
      movementId,
      type: track.type,
      voiceCode: track.voiceCode,
      extension,
    });

    const deplace = await storage.moveObject(source, cible);
    if (!deplace.ok) {
      console.error("work-actions moveObject", deplace.error);
      failed.push(track.state.filename);
      continue;
    }

    // Prisma refuse un nul dans une clé unique composée, et voiceId l'est
    // pour un tutti. On retrouve donc la case par ses coordonnées.
    const existante = await prisma.audioFile.findFirst({
      where: { movementId, voiceId, type: track.type },
      select: { id: true },
    });

    const valeurs = {
      storageKey: cible,
      // La clé définitive ne porte que le pupitre, on garde donc le nom
      // d'origine pour pouvoir le réafficher dans la matrice.
      originalFilename: track.state.filename,
      durationSeconds: track.state.durationSeconds,
      mimeType: track.state.mimeType,
      sizeBytes: track.state.sizeBytes,
    };

    if (existante) {
      await prisma.audioFile.update({
        where: { id: existante.id },
        data: valeurs,
      });
    } else {
      await prisma.audioFile.create({
        data: { movementId, voiceId, type: track.type, ...valeurs },
      });
    }
    stored += 1;
  }

  return { stored, failed };
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
    // Compté après la transaction, rapporté à l'administrateur.
    let objetsNonSupprimes = 0;
    // Collectées dans la transaction, effacées seulement après son commit :
    // effacer pendant reviendrait, sur un retour arrière, à détruire des
    // fichiers dont la ligne survit. Un objet resté en trop se rattrape, un
    // fichier détruit à tort non.
    const aEffacer: string[] = [];

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

        // Les AudioFile partent en cascade avec le mouvement, mais pas les
        // objets R2, qui sont sous works et non sous pending : la règle de
        // cycle de vie ne les ramasserait jamais. On relève leurs clés tant
        // que les lignes existent, l'effacement a lieu après le commit.
        const orphelins = await tx.audioFile.findMany({
          where: { movementId: { in: doomed.map((movement) => movement.id) } },
          select: { storageKey: true },
        });
        aEffacer.push(...orphelins.map((piste) => piste.storageKey));

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
      enregistres = movements;

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
        // Retirée du catalogue, ce qui n'est pas la même chose qu'incomplète :
        // elle sort de tous les calculs, mais la ligne reste pour l'historique.
        await tx.product.updateMany({
          where: { id: { in: perimes } },
          data: { isActive: false, isRetired: true },
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
              // Elle est de nouveau engendrée, elle n'est donc plus retirée.
              // isActive sera tranché par la synchronisation, sur les pistes.
              isRetired: false,
            },
          });
        } else {
          await tx.product.create({ data: { ...row, workId } });
        }
      }

      // Un pupitre retiré laisse ses pistes derrière lui, la ligne comme
      // l'objet : rien d'autre ne les ramasse, la réconciliation ci dessus ne
      // touchant qu'aux offres. On filtre en mémoire plutôt qu'avec un notIn
      // sur une colonne nullable, dont la sémantique SQL écarterait aussi les
      // pistes communes, qui n'ont justement aucun pupitre.
      const retenus = new Set(voices.map((voice) => voice.id));
      const toutes = await tx.audioFile.findMany({
        where: { movement: { workId } },
        select: { id: true, storageKey: true, voiceId: true },
      });
      const pistesRetirees = toutes.filter(
        (piste) => piste.voiceId !== null && !retenus.has(piste.voiceId),
      );

      if (pistesRetirees.length > 0) {
        const idsRetires = [
          ...new Set(pistesRetirees.map((piste) => piste.voiceId!)),
        ];

        // Même garde que pour un mouvement supprimé : on ne détruit pas le
        // fichier d'un pupitre que quelqu'un a déjà payé.
        const vendus = await tx.libraryItem.findMany({
          where: { workId, voiceId: { in: idsRetires } },
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

        aEffacer.push(...pistesRetirees.map((piste) => piste.storageKey));
        await tx.audioFile.deleteMany({
          where: { id: { in: pistesRetirees.map((piste) => piste.id) } },
        });
      }
    });

    // Les fichiers partent maintenant que la base a commité.
    for (const key of aEffacer) {
      const efface = await storage.deleteObject(key);
      if (!efface.ok) {
        // Un échec ne rattrape rien : la ligne est partie, l'objet reste
        // orphelin. On le compte pour le dire à l'administrateur.
        console.error("work-actions deleteObject", efface.error);
        objetsNonSupprimes += 1;
      }
    }

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

  let objetsNonSupprimes = 0;
  for (const piste of pistes) {
    const efface = await storage.deleteObject(piste.storageKey);
    if (!efface.ok) {
      console.error("work-actions deleteWork orphelin", efface.error);
      objetsNonSupprimes += 1;
    }
  }

  await prisma.work.delete({ where: { id: workId } });

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
