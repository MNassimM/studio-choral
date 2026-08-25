import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

/**
 * Client Prisma partagé de l'application.
 *
 * @remarks
 * Une seule instance pour tout le projet. En créer une seconde ouvrirait un
 * pool de connexions supplémentaire vers Postgres, ce qui finit par saturer
 * la base.
 *
 * Hors production, le client est mis en cache sur globalThis. Sans ça, chaque
 * rechargement à chaud en développement construirait un nouveau client et
 * laisserait le précédent avec ses connexions ouvertes.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
