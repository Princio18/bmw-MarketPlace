-- Migration 10 : sécurité et traçabilité.
--
-- 1. `rate_limits` : limitation de débit partagée entre instances serverless
--    (Vercel), stockée en base (un compteur en mémoire est inopérant).
-- 2. `audit_log` : journal des actions sensibles des administrateurs.
-- 3. `orders.terms_version` : version des conditions générales acceptée pour
--    chaque commande (traçabilité juridique).

CREATE TABLE "rate_limits" (
    "key"      TEXT NOT NULL,
    "hits"     INTEGER NOT NULL,
    "reset_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "audit_log" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id"    UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "action"      VARCHAR(60) NOT NULL,
    "entity_type" VARCHAR(30),
    "entity_id"   UUID,
    "metadata"    JSONB,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_audit_created" ON "audit_log"("created_at" DESC);

ALTER TABLE "orders" ADD COLUMN "terms_version" VARCHAR(20);
