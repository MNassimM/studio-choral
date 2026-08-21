-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "GrantSource" AS ENUM ('PURCHASE', 'MANUAL_GRANT', 'PROMO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "work_id" TEXT NOT NULL,
    "movement_id" TEXT,
    "voice_id" TEXT,
    "scope" "AccessScope" NOT NULL,
    "coverage" "VoiceCoverage" NOT NULL,
    "source" "GrantSource" NOT NULL DEFAULT 'PURCHASE',
    "purchase_item_id" TEXT,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "library_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "library_items_user_id_work_id_idx" ON "library_items"("user_id", "work_id");

-- CreateIndex
CREATE INDEX "library_items_user_id_idx" ON "library_items"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "library_items_user_id_work_id_movement_id_voice_id_coverage_key" ON "library_items"("user_id", "work_id", "movement_id", "voice_id", "coverage");

-- AddForeignKey
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_movement_id_fkey" FOREIGN KEY ("movement_id") REFERENCES "movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_voice_id_fkey" FOREIGN KEY ("voice_id") REFERENCES "voices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Postgres traite chaque NULL comme distinct dans un index unique standard, donc
-- l'unique composite ci-dessus (library_items_user_id_work_id_movement_id_voice_id_coverage_key)
-- ne protège que le cas où movement_id ET voice_id sont tous les deux renseignés
-- (MOVEMENT + SINGLE_VOICE). Les trois autres combinaisons impliquent au moins un
-- NULL et échappent donc à cette contrainte : sans les index partiels ci-dessous,
-- rien n'empêcherait par exemple deux droits "toutes les voix - oeuvre complète"
-- identiques pour le même utilisateur sur la même oeuvre. Même schéma que
-- products_work_single_voice_key / products_movement_all_voices_key /
-- products_work_all_voices_key, avec user_id en plus dans la clé.

-- WORK + SINGLE_VOICE : movement_id NULL, voice_id renseigné
-- -> au plus un droit par (utilisateur, oeuvre, voix).
CREATE UNIQUE INDEX "library_items_work_single_voice_key"
    ON "library_items" ("user_id", "work_id", "voice_id", "coverage")
    WHERE "movement_id" IS NULL AND "voice_id" IS NOT NULL;

-- MOVEMENT + ALL_VOICES : movement_id renseigné, voice_id NULL
-- -> au plus un droit "toutes les voix" par (utilisateur, mouvement).
CREATE UNIQUE INDEX "library_items_movement_all_voices_key"
    ON "library_items" ("user_id", "work_id", "movement_id", "coverage")
    WHERE "movement_id" IS NOT NULL AND "voice_id" IS NULL;

-- WORK + ALL_VOICES : movement_id NULL, voice_id NULL
-- -> au plus un droit "toutes les voix - oeuvre complète" par (utilisateur, oeuvre).
CREATE UNIQUE INDEX "library_items_work_all_voices_key"
    ON "library_items" ("user_id", "work_id", "coverage")
    WHERE "movement_id" IS NULL AND "voice_id" IS NULL;
