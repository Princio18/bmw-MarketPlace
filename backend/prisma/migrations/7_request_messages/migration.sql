-- Migration 7 : messages liés à une demande de configuration.
--
-- Chaque email envoyé au client (réponse manuelle d'un admin ou email
-- automatique comme l'accusé de réception) est journalisé ici. `sent_by` NULL
-- signifie « message automatique ». delivery_status conserve la trace d'un
-- échec d'envoi pour que l'admin puisse le constater (jamais perdu).

CREATE TABLE "request_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "request_id" UUID NOT NULL REFERENCES "configuration_requests"("id") ON DELETE CASCADE,
    "sent_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "delivery_status" VARCHAR(10) NOT NULL DEFAULT 'sent',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_messages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "request_messages_delivery_status_check"
        CHECK ("delivery_status" IN ('sent', 'failed'))
);

CREATE INDEX "idx_request_messages_request" ON "request_messages"("request_id");
