-- CreateEnum
CREATE TYPE "AccessScope" AS ENUM ('MOVEMENT', 'WORK');

-- CreateEnum
CREATE TYPE "VoiceCoverage" AS ENUM ('SINGLE_VOICE', 'ALL_VOICES');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "work_id" TEXT NOT NULL,
    "movement_id" TEXT,
    "voice_id" TEXT,
    "scope" "AccessScope" NOT NULL,
    "coverage" "VoiceCoverage" NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL,
    "stripe_price_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_stripe_price_id_key" ON "products"("stripe_price_id");

-- CreateIndex
CREATE INDEX "products_work_id_is_active_idx" ON "products"("work_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "products_work_id_movement_id_voice_id_coverage_key" ON "products"("work_id", "movement_id", "voice_id", "coverage");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_movement_id_fkey" FOREIGN KEY ("movement_id") REFERENCES "movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_voice_id_fkey" FOREIGN KEY ("voice_id") REFERENCES "voices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Postgres traite chaque NULL comme distinct dans un index unique standard, donc
-- l'unique composite ci-dessus (products_work_id_movement_id_voice_id_coverage_key)
-- ne protège que le cas où movement_id ET voice_id sont tous les deux renseignés
-- (MOVEMENT + SINGLE_VOICE). Les trois autres combinaisons impliquent au moins un
-- NULL et échappent donc à cette contrainte : sans les index partiels ci-dessous,
-- rien n'empêcherait par exemple deux offres "toutes les voix - oeuvre complète"
-- identiques sur la même oeuvre.

-- WORK + SINGLE_VOICE : movement_id NULL, voice_id renseigné
-- -> au plus une offre par (oeuvre, voix).
CREATE UNIQUE INDEX "products_work_single_voice_key"
    ON "products" ("work_id", "voice_id", "coverage")
    WHERE "movement_id" IS NULL AND "voice_id" IS NOT NULL;

-- MOVEMENT + ALL_VOICES : movement_id renseigné, voice_id NULL
-- -> au plus une offre "toutes les voix" par mouvement.
CREATE UNIQUE INDEX "products_movement_all_voices_key"
    ON "products" ("work_id", "movement_id", "coverage")
    WHERE "movement_id" IS NOT NULL AND "voice_id" IS NULL;

-- WORK + ALL_VOICES : movement_id NULL, voice_id NULL
-- -> au plus une offre "toutes les voix - oeuvre complete" par oeuvre.
CREATE UNIQUE INDEX "products_work_all_voices_key"
    ON "products" ("work_id", "coverage")
    WHERE "movement_id" IS NULL AND "voice_id" IS NULL;
