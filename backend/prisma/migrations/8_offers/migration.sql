-- Migration 8 : offres personnalisées + paiement via offre.
--
-- Une offre est émise par un admin à partir d'une demande de configuration
-- (configuration_requests). Elle fige un décompte de prix (`price_breakdown`,
-- convention TVA incluse) et un montant total. Le client la règle via Stripe
-- Checkout ; à la confirmation du paiement, l'offre passe à 'accepted' et est
-- reliée à la commande réellement payée.
--
-- Invariant : au plus UNE offre 'active' par demande (index partiel unique).
-- L'émission d'une nouvelle offre retire d'abord l'offre active précédente.

CREATE TABLE "offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL REFERENCES "configuration_requests"("id") ON DELETE CASCADE,
    "vehicle_id" UUID NOT NULL REFERENCES "vehicles"("id"),
    "created_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'GBP',
    "total_amount" NUMERIC(10, 2) NOT NULL,
    "price_breakdown" JSONB NOT NULL,
    "delivery_weeks_min" INTEGER,
    "delivery_weeks_max" INTEGER,
    "notes" TEXT,
    "terms_version" VARCHAR(20),
    "stripe_checkout_session_id" TEXT,
    "paid_order_id" UUID REFERENCES "orders"("id") ON DELETE SET NULL,
    "expires_at" TIMESTAMPTZ,
    "accepted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "offers_status_check"
        CHECK ("status" IN ('active', 'accepted', 'expired', 'withdrawn'))
);

-- Au plus une offre 'active' par demande : autorise plusieurs offres dans
-- l'historique (withdrawn / expired / accepted) mais une seule en cours.
CREATE UNIQUE INDEX "uq_offers_active_per_request"
    ON "offers"("request_id") WHERE "status" = 'active';

CREATE INDEX "idx_offers_request" ON "offers"("request_id");
CREATE INDEX "idx_offers_status" ON "offers"("status");

-- Rattachement de la commande à l'offre d'origine + décompte figé au moment
-- du paiement (le reçu réutilise `price_breakdown`).
ALTER TABLE "orders"
    ADD COLUMN "offer_id" UUID REFERENCES "offers"("id") ON DELETE SET NULL,
    ADD COLUMN "price_breakdown" JSONB;

CREATE INDEX "idx_orders_offer" ON "orders"("offer_id");

-- Une offre acceptée ne peut produire qu'une seule commande payée : garde-fou
-- contre un double webhook ou un double checkout.
CREATE UNIQUE INDEX "uq_orders_paid_per_offer"
    ON "orders"("offer_id") WHERE "status" = 'paid' AND "offer_id" IS NOT NULL;
