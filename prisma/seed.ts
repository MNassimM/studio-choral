import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  buildDemoProducts,
  DEMO_CATALOG,
  DEMO_LIBRARY_ITEMS,
  DEMO_USERS,
  DEMO_VOICES,
} from "../src/lib/demo/dataset";
import { assertValidLibraryItem } from "../src/lib/library-items/invariants";
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
      period: work.period,
      voicing: work.voicing,
      language: work.language,
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

async function seedWorkTranslations(workIdBySlug: Map<string, string>) {
  console.log("Traductions d'œuvres (WorkTranslation) :");

  for (const work of DEMO_CATALOG) {
    const workId = workIdBySlug.get(work.slug);
    if (!workId) {
      throw new Error(
        `Œuvre introuvable pour ses traductions ("${work.slug}")`,
      );
    }

    for (const translation of work.translations) {
      const data = {
        workId,
        locale: translation.locale,
        slug: translation.slug,
        title: translation.title,
        shortDescription: translation.shortDescription,
        description: translation.description,
      };

      const existing = await prisma.workTranslation.findUnique({
        where: { workId_locale: { workId, locale: translation.locale } },
      });

      await prisma.workTranslation.upsert({
        where: { workId_locale: { workId, locale: translation.locale } },
        update: data,
        create: data,
      });

      console.log(
        `  ${existing ? "= déjà présente" : "+ créée"} : ${work.slug} (${translation.locale})`,
      );
    }
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
    // toute écriture en base - échoue bruyamment avec le sku fautif.
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

async function seedUsers(): Promise<Map<string, string>> {
  console.log("Comptes de démonstration (User) :");
  const userIdByEmail = new Map<string, string>();

  for (const user of DEMO_USERS) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    });

    const saved = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, role: user.role },
      create: user,
    });

    userIdByEmail.set(saved.email, saved.id);

    console.log(
      `  ${existing ? "= déjà présent" : "+ créé"} : ${saved.email} (${saved.name})`,
    );
  }

  return userIdByEmail;
}

async function seedLibraryItems(
  userIdByEmail: Map<string, string>,
  workIdBySlug: Map<string, string>,
  movementIdByKey: Map<string, string>,
  voiceIdByCode: Map<string, string>,
) {
  console.log("Droits d'accès (LibraryItem) :");

  const summaryByUserEmail = new Map<
    string,
    { created: number; existing: number }
  >();

  for (const item of DEMO_LIBRARY_ITEMS) {
    const userId = userIdByEmail.get(item.userEmail);
    if (!userId) {
      throw new Error(`Utilisateur introuvable : "${item.userEmail}"`);
    }

    const workId = workIdBySlug.get(item.workSlug);
    if (!workId) {
      throw new Error(
        `Œuvre introuvable pour le droit de "${item.userEmail}" (workSlug="${item.workSlug}")`,
      );
    }

    const movementId = item.movementSlug
      ? (movementIdByKey.get(`${item.workSlug}/${item.movementSlug}`) ?? null)
      : null;
    if (item.movementSlug && !movementId) {
      throw new Error(
        `Mouvement introuvable pour le droit de "${item.userEmail}" ("${item.workSlug}/${item.movementSlug}")`,
      );
    }

    const voiceId = item.voiceCode
      ? (voiceIdByCode.get(item.voiceCode) ?? null)
      : null;
    if (item.voiceCode && !voiceId) {
      throw new Error(
        `Voix introuvable pour le droit de "${item.userEmail}" ("${item.voiceCode}")`,
      );
    }

    // Validation des invariants scope/coverage <-> movementId/voiceId AVANT
    // toute écriture en base - échoue bruyamment avec l'identité fautive.
    const data = assertValidLibraryItem({
      userId,
      workId,
      movementId,
      voiceId,
      scope: item.scope,
      coverage: item.coverage,
      source: item.source,
      purchaseItemId: null,
    });

    // movementId/voiceId peuvent valoir NULL : comme pour AudioFile, l'unique
    // composite ne peut pas cibler ces lignes via upsert (Postgres traite
    // chaque NULL comme distinct). On cherche à la main puis on crée ou met
    // à jour par id.
    const existing = await prisma.libraryItem.findFirst({
      where: {
        userId: data.userId,
        workId: data.workId,
        movementId: data.movementId,
        voiceId: data.voiceId,
        coverage: data.coverage,
      },
    });

    if (existing) {
      await prisma.libraryItem.update({ where: { id: existing.id }, data });
    } else {
      await prisma.libraryItem.create({ data });
    }

    const summary = summaryByUserEmail.get(item.userEmail) ?? {
      created: 0,
      existing: 0,
    };
    if (existing) {
      summary.existing++;
    } else {
      summary.created++;
    }
    summaryByUserEmail.set(item.userEmail, summary);
  }

  for (const [userEmail, summary] of summaryByUserEmail) {
    console.log(
      `  ${userEmail} : ${summary.created} créé(s), ${summary.existing} déjà présent(s)`,
    );
  }
}

async function main() {
  const voiceIdByCode = await seedVoices();
  const { workIdBySlug, movementIdByKey } = await seedWorksAndMovements();
  await seedWorkTranslations(workIdBySlug);
  await seedProducts(workIdBySlug, movementIdByKey, voiceIdByCode);
  const userIdByEmail = await seedUsers();
  await seedLibraryItems(
    userIdByEmail,
    workIdBySlug,
    movementIdByKey,
    voiceIdByCode,
  );
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
