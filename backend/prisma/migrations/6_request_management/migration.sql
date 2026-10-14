-- Migration 6 : gestion des demandes de configuration (« request management »).
--
-- Les demandes ne sont plus créées par des visiteurs anonymes : elles sont
-- désormais rattachées à un utilisateur, créées immédiatement au « Save and
-- Confirm » puis complétées par la page « Update details » (PUT). Le statut
-- n'évolue que côté admin / système. On ajoute aussi les configurations
-- sauvegardées (« Save only »).

-- 1) Enrichissement de configuration_requests ---------------------------------
ALTER TABLE "configuration_requests"
    ALTER COLUMN "first_name" DROP NOT NULL,
    ALTER COLUMN "last_name" DROP NOT NULL,
    ALTER COLUMN "contact_preference" SET DEFAULT 'email',
    ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'new',
    ADD COLUMN "admin_notes" TEXT,
    ADD COLUMN "handled_by" UUID,
    ADD COLUMN "details_confirmed_at" TIMESTAMP,
    ADD COLUMN "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "configuration_requests"
    ADD CONSTRAINT "configuration_requests_status_check"
    CHECK ("status" IN ('new', 'contacted', 'offer_sent', 'converted', 'closed'));

ALTER TABLE "configuration_requests"
    ADD CONSTRAINT "configuration_requests_handled_by_fkey"
    FOREIGN KEY ("handled_by") REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX "idx_requests_status" ON "configuration_requests"("status");
CREATE INDEX "idx_requests_user" ON "configuration_requests"("user_id");

-- 2) Configurations sauvegardées ----------------------------------------------
CREATE TABLE "saved_configurations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "vehicle_id" UUID NOT NULL REFERENCES "vehicles"("id"),
    "configuration_data" JSONB NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP,

    CONSTRAINT "saved_configurations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_saved_configurations_user" ON "saved_configurations"("user_id");
