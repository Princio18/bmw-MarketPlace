-- CreateTable : concessionnaires BMW sélectionnables (DealerMapPicker) et
-- demandes de configuration soumises depuis le configurateur
-- (« Save and Confirm »). user_id reste NULL pour les visiteurs anonymes ;
-- la route POST /api/configuration-requests ne rejette jamais une requête
-- sans token.
CREATE TABLE "dealers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,

    CONSTRAINT "dealers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "configuration_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "vehicle_id" UUID NOT NULL REFERENCES "vehicles"("id"),
    "configuration_data" JSONB,
    "salutation" VARCHAR(10),
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "contact_preference" VARCHAR(10) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone_country_code" VARCHAR(5),
    "phone_number" VARCHAR(30),
    "preferred_dealer_id" UUID REFERENCES "dealers"("id") ON DELETE SET NULL,
    "marketing_channels" JSONB,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuration_requests_pkey" PRIMARY KEY ("id")
);