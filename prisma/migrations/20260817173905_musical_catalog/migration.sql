-- CreateEnum
CREATE TYPE "AudioType" AS ENUM ('SOLO', 'PREDOMINANT', 'TUTTI', 'ACCOMPANIMENT', 'PREVIEW');

-- CreateTable
CREATE TABLE "works" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "composer" TEXT NOT NULL,
    "catalogue_ref" TEXT,
    "short_description" TEXT,
    "description" TEXT,
    "cover_image_key" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movements" (
    "id" TEXT NOT NULL,
    "work_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voices" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "voices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_files" (
    "id" TEXT NOT NULL,
    "movement_id" TEXT NOT NULL,
    "voice_id" TEXT,
    "type" "AudioType" NOT NULL,
    "storage_key" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER,
    "preview_start_sec" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "works_slug_key" ON "works"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "movements_work_id_slug_key" ON "movements"("work_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "movements_work_id_position_key" ON "movements"("work_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "voices_code_key" ON "voices"("code");

-- CreateIndex
CREATE INDEX "audio_files_movement_id_idx" ON "audio_files"("movement_id");

-- CreateIndex
CREATE UNIQUE INDEX "audio_files_movement_id_voice_id_type_key" ON "audio_files"("movement_id", "voice_id", "type");

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_files" ADD CONSTRAINT "audio_files_movement_id_fkey" FOREIGN KEY ("movement_id") REFERENCES "movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_files" ADD CONSTRAINT "audio_files_voice_id_fkey" FOREIGN KEY ("voice_id") REFERENCES "voices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Postgres treats NULL as distinct in unique constraints, so the composite
-- unique index above does NOT prevent two TUTTI (or two ACCOMPANIMENT) rows
-- with voice_id IS NULL on the same movement. Enforce that case separately
-- with a partial unique index.
CREATE UNIQUE INDEX "audio_files_movement_type_no_voice"
    ON "audio_files" ("movement_id", "type")
    WHERE "voice_id" IS NULL;
