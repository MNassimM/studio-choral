-- AlterTable
ALTER TABLE "works" ADD COLUMN     "published_at" TIMESTAMP(3);

-- Reprise des oeuvres déjà publiées : leur date de mise en vente n'a jamais
-- été enregistrée, on retient celle de leur saisie. Approximation assumée,
-- préférable à un vide qui les exclurait à jamais du badge nouveauté.
UPDATE "works" SET "published_at" = "created_at" WHERE "is_published" = true;
