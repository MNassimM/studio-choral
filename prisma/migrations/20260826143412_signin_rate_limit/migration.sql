-- CreateTable
CREATE TABLE "sign_in_attempts" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sign_in_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sign_in_attempts_scope_key_hash_created_at_idx" ON "sign_in_attempts"("scope", "key_hash", "created_at");

-- CreateIndex
CREATE INDEX "sign_in_attempts_created_at_idx" ON "sign_in_attempts"("created_at");
