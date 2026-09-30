-- CreateTable : accessoires decessionnés (jantes, volant, barres de toit...)
-- Vendus séparément du véhicule, avec stock suivi. `image_data` / `image_mime_type`
-- suivent exactement le pattern de `vehicles` (BYTEA + fallback placeholder).
CREATE TABLE "accessories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "image_data" BYTEA,
    "image_mime_type" VARCHAR(50),
    "stock_quantity" INT NOT NULL DEFAULT 0,
    "badge" VARCHAR(50),
    "requires_adjustment" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP DEFAULT NULL,

    CONSTRAINT "accessories_pkey" PRIMARY KEY ("id")
);

-- Index partiel (soft-delete) : même convention que idx_vehicles_active.
CREATE INDEX "idx_accessories_active" ON "accessories" ("deleted_at") WHERE "deleted_at" IS NULL;
