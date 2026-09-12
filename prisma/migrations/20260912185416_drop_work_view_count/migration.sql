-- Le total cumulé disparaît : la popularité se mesure désormais uniquement
-- sur la fenêtre glissante de 30 jours de work_views.

-- DropIndex
DROP INDEX "works_view_count_idx";

-- AlterTable
ALTER TABLE "works" DROP COLUMN "view_count";
