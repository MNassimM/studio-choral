import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  buildDemoAudioTracks,
  buildDemoProducts,
  DEMO_CATALOG,
  DEMO_VOICES,
} from "../src/lib/demo/dataset";
import { assertValidProduct } from "../src/lib/products/invariants";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seedVoices(): Promise<Map<string, string>> {
  console.log("Pupitres (Voice) :");
  const voiceIdByCode = new Map<string, string>();

  for (const voice of DEMO_VOICES) {
    const existing = await prisma.voice.findUnique({
      where: { code: voice.code },
    });

    const saved = await prisma.voice.upsert({
      where: { code: voice.code },
      update: { label: voice.label, position: voice.position },
      create: voice,
    });

    voiceIdByCode.set(saved.code, saved.id);

    console.log(
      `  ${existing ? "= déjà présent" : "+ créé"} : ${saved.code} (${saved.label})`,
    );
  }

  return voiceIdByCode;
}

type WorkAndMovementIds = {
  workIdBySlug: Map<string, string>;
  movementIdByKey: Map<string, string>;
};

async function seedWorksAndMovements(): Promise<WorkAndMovementIds> {
  console.log("Œuvres et mouvements :");
  const workIdBySlug = new Map<string, string>();
  const movementIdByKey = new Map<string, string>();

  for (const work of DEMO_CATALOG) {
    // pricing/priceOverrides pilotent buildDemoProducts(), ce ne sont pas des
    // colonnes du modèle Work : on ne transmet que les champs Work eux-mêmes.
    const workData = {
      slug: work.slug,
      title: work.title,
      composer: work.composer,
      catalogueRef: work.catalogueRef,
      shortDescription: work.shortDescription,
      description: work.description,
      composedYear: work.composedYear,
      isPublished: work.isPublished,
    };

    const existingWork = await prisma.work.findUnique({
      where: { slug: workData.slug },
    });

    const savedWork = await prisma.work.upsert({
      where: { slug: workData.slug },
      update: workData,
      create: workData,
    });

    workIdBySlug.set(savedWork.slug, savedWork.id);

    console.log(
      `  ${existingWork ? "= déjà présente" : "+ créée"} : ${savedWork.title} (${savedWork.slug})`,
    );

    for (const movement of work.movements) {
      const existingMovement = await prisma.movement.findUnique({
        where: {
          workId_slug: { workId: savedWork.id, slug: movement.slug },
        },
      });

      const savedMovement = await prisma.movement.upsert({
        where: {
          workId_slug: { workId: savedWork.id, slug: movement.slug },
        },
        update: { title: movement.title, position: movement.position },
        create: {
          workId: savedWork.id,
          slug: movement.slug,
          title: movement.title,
          position: movement.position,
        },
      });

      movementIdByKey.set(`${work.slug}/${movement.slug}`, savedMovement.id);

      console.log(
        `    ${existingMovement ? "= déjà présent" : "+ créé"} : ${savedMovement.position}. ${savedMovement.title}`,
      );
    }
  }

  return { workIdBySlug, movementIdByKey };
}

async function seedAudioFiles(
  movementIdByKey: Map<string, string>,
  voiceIdByCode: Map<string, string>,
) {
  console.log("Fichiers audio (AudioFile) :");
  const tracks = buildDemoAudioTracks();

  // Compteurs par mouvement pour un résumé lisible (créés vs déjà présents),
  // plutôt qu'une ligne par piste.
  const summaryByMovementKey = new Map<
    string,
    { created: number; existing: number }
  >();

  for (const track of tracks) {
    const movementKey = `${track.workSlug}/${track.movementSlug}`;
    const movementId = movementIdByKey.get(movementKey);
    if (!movementId) {
      throw new Error(`Mouvement introuvable pour la piste "${movementKey}"`);
    }

    const voiceId = track.voiceCode
      ? (voiceIdByCode.get(track.voiceCode) ?? null)
      : null;
    if (track.voiceCode && !voiceId) {
      throw new Error(`Voix introuvable : "${track.voiceCode}"`);
    }

    const data = {
      movementId,
      voiceId,
      type: track.type,
      storageKey: track.storageKey,
      durationSeconds: track.durationSeconds,
      mimeType: track.mimeType,
      previewStartSec: track.previewStartSec,
    };

    let wasExisting: boolean;

    if (voiceId) {
      // voiceId non NULL : la contrainte @@unique([movementId, voiceId, type])
      // fonctionne normalement avec upsert.
      const existing = await prisma.audioFile.findUnique({
        where: {
          movementId_voiceId_type: {
            movementId,
            voiceId,
            type: track.type,
          },
        },
      });
      wasExisting = existing !== null;

      await prisma.audioFile.upsert({
        where: {
          movementId_voiceId_type: {
            movementId,
            voiceId,
            type: track.type,
          },
        },
        update: data,
        create: data,
      });
    } else {
      // voiceId NULL (TUTTI / ACCOMPANIMENT) : Postgres traite chaque NULL
      // comme distinct, donc l'unique composite ne peut pas cibler ces lignes
      // via upsert. On cherche à la main puis on crée ou met à jour par id.
      const existing = await prisma.audioFile.findFirst({
        where: { movementId, voiceId: null, type: track.type },
      });
      wasExisting = existing !== null;

      if (existing) {
        await prisma.audioFile.update({ where: { id: existing.id }, data });
      } else {
        await prisma.audioFile.create({ data });
      }
    }

    const summary = summaryByMovementKey.get(movementKey) ?? {
      created: 0,
      existing: 0,
    };
    if (wasExisting) {
      summary.existing++;
    } else {
      summary.created++;
    }
    summaryByMovementKey.set(movementKey, summary);
  }

  for (const [movementKey, summary] of summaryByMovementKey) {
    console.log(
      `  ${movementKey} : ${summary.created} créée(s), ${summary.existing} déjà présente(s)`,
    );
  }
}

async function seedProducts(
  workIdBySlug: Map<string, string>,
  movementIdByKey: Map<string, string>,
  voiceIdByCode: Map<string, string>,
) {
  console.log("Produits (Product) :");
  const products = buildDemoProducts();

  const summaryByWorkSlug = new Map<
    string,
    { created: number; existing: number }
  >();

  for (const product of products) {
    const workId = workIdBySlug.get(product.workSlug);
    if (!workId) {
      throw new Error(
        `Œuvre introuvable pour le produit "${product.sku}" (workSlug="${product.workSlug}")`,
      );
    }

    const movementId = product.movementSlug
      ? (movementIdByKey.get(`${product.workSlug}/${product.movementSlug}`) ??
        null)
      : null;
    if (product.movementSlug && !movementId) {
      throw new Error(`Mouvement introuvable pour le produit "${product.sku}"`);
    }

    const voiceId = product.voiceCode
      ? (voiceIdByCode.get(product.voiceCode) ?? null)
      : null;
    if (product.voiceCode && !voiceId) {
      throw new Error(`Voix introuvable pour le produit "${product.sku}"`);
    }

    // Validation des invariants scope/coverage <-> movementId/voiceId AVANT
    // toute écriture en base — échoue bruyamment avec le sku fautif.
    const data = assertValidProduct({
      sku: product.sku,
      name: product.name,
      workId,
      movementId,
      voiceId,
      scope: product.scope,
      coverage: product.coverage,
      priceCents: product.priceCents,
      currency: product.currency,
      isActive: product.isActive,
      position: product.position,
    });

    const existing = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    await prisma.product.upsert({
      where: { sku: data.sku },
      update: data,
      create: data,
    });

    const summary = summaryByWorkSlug.get(product.workSlug) ?? {
      created: 0,
      existing: 0,
    };
    if (existing) {
      summary.existing++;
    } else {
      summary.created++;
    }
    summaryByWorkSlug.set(product.workSlug, summary);
  }

  for (const [workSlug, summary] of summaryByWorkSlug) {
    console.log(
      `  ${workSlug} : ${summary.created} créé(s), ${summary.existing} déjà présent(s)`,
    );
  }
}

async function main() {
  const voiceIdByCode = await seedVoices();
  const { workIdBySlug, movementIdByKey } = await seedWorksAndMovements();
  await seedAudioFiles(movementIdByKey, voiceIdByCode);
  await seedProducts(workIdBySlug, movementIdByKey, voiceIdByCode);
}

main()
  .then(() => {
    console.log("Seed terminée avec succès.");
  })
  .catch((error) => {
    console.error("Échec de la seed :", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
