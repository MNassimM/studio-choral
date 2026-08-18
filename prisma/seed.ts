import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  buildDemoAudioTracks,
  DEMO_CATALOG,
  DEMO_VOICES,
} from "../src/lib/demo/dataset";

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

async function seedWorksAndMovements(): Promise<Map<string, string>> {
  console.log("Œuvres et mouvements :");
  const movementIdByKey = new Map<string, string>();

  for (const work of DEMO_CATALOG) {
    const { movements, ...workData } = work;

    const existingWork = await prisma.work.findUnique({
      where: { slug: workData.slug },
    });

    const savedWork = await prisma.work.upsert({
      where: { slug: workData.slug },
      update: workData,
      create: workData,
    });

    console.log(
      `  ${existingWork ? "= déjà présente" : "+ créée"} : ${savedWork.title} (${savedWork.slug})`,
    );

    for (const movement of movements) {
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

  return movementIdByKey;
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

async function main() {
  const voiceIdByCode = await seedVoices();
  const movementIdByKey = await seedWorksAndMovements();
  await seedAudioFiles(movementIdByKey, voiceIdByCode);
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
