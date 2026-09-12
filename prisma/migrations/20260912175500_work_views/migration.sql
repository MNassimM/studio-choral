-- AlterTable
ALTER TABLE "works" ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "work_views" (
    "id" TEXT NOT NULL,
    "work_id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "work_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "work_views_day_idx" ON "work_views"("day");

-- CreateIndex
CREATE UNIQUE INDEX "work_views_work_id_day_key" ON "work_views"("work_id", "day");

-- CreateIndex
CREATE INDEX "works_view_count_idx" ON "works"("view_count");

-- AddForeignKey
ALTER TABLE "work_views" ADD CONSTRAINT "work_views_work_id_fkey" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE ON UPDATE CASCADE;
