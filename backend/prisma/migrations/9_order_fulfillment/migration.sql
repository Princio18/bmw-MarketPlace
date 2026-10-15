-- Migration 9 : suivi de commande après paiement (ready → delivered).
--
-- Ajoute les informations de remise (centre, date, VIN) sur `orders` et une
-- table `order_status_history` qui journalise chaque transition de statut.
-- L'historique est la source de vérité affichée côté client (frise), y compris
-- une ligne système 'paid' insérée par le webhook.

ALTER TABLE "orders"
    ADD COLUMN "handover_dealer_id" UUID REFERENCES "dealers"("id") ON DELETE SET NULL,
    ADD COLUMN "scheduled_handover_at" TIMESTAMPTZ,
    ADD COLUMN "vin" VARCHAR(17);

CREATE TABLE "order_status_history" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id"   UUID NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
    "to_status"  VARCHAR(20) NOT NULL,
    "note"       TEXT,
    "changed_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "order_status_history_status_check"
        CHECK ("to_status" IN ('paid', 'pending', 'ready', 'delivered', 'cancelled', 'refunded'))
);

CREATE INDEX "idx_osh_order_created" ON "order_status_history"("order_id", "created_at");

-- Commandes payées antérieures à cette migration : matérialise l'étape 'Paid'
-- à partir de orders.created_at, sinon l'historique serait vide (la frise
-- n'aurait pas de point de départ).
INSERT INTO "order_status_history" ("order_id", "to_status", "created_at")
SELECT "id", 'paid', "created_at"
FROM "orders"
WHERE "status" = 'paid';
