-- CreateTable
CREATE TABLE "cart_lines" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "work_id" TEXT NOT NULL,
    "movement_id" TEXT,
    "voice_code" TEXT,
    "scope" "AccessScope" NOT NULL,
    "coverage" "VoiceCoverage" NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cart_lines_user_id_idx" ON "cart_lines"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_lines_user_id_sku_key" ON "cart_lines"("user_id", "sku");

-- AddForeignKey
ALTER TABLE "cart_lines" ADD CONSTRAINT "cart_lines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
