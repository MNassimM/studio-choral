-- CreateTable
CREATE TABLE "work_translations" (
    "id" TEXT NOT NULL,
    "work_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "short_description" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_translations_work_id_locale_key" ON "work_translations"("work_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "work_translations_locale_slug_key" ON "work_translations"("locale", "slug");

-- AddForeignKey
ALTER TABLE "work_translations" ADD CONSTRAINT "work_translations_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;
