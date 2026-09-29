-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "first_name" VARCHAR(100) NOT NULL DEFAULT '',
    "last_name" VARCHAR(100) NOT NULL DEFAULT '',
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role_id" INTEGER,
    "two_factor_secret" TEXT,
    "is_two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "activation_token_hash" TEXT,
    "activation_expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "profile_photo_data" BYTEA,
    "profile_photo_mime_type" VARCHAR(50),
    "is_super_admin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "model_name" VARCHAR(100) NOT NULL,
    "base_price" DECIMAL(10,2),
    "category" VARCHAR(30) NOT NULL DEFAULT 'SUV',
    "series" VARCHAR(10) NOT NULL DEFAULT 'X',
    "variant_label" VARCHAR(50) NOT NULL DEFAULT 'Models',
    "is_new" BOOLEAN NOT NULL DEFAULT false,
    "is_m_performance" BOOLEAN NOT NULL DEFAULT false,
    "drivetrain" VARCHAR(20) NOT NULL DEFAULT 'petrol',
    "image_data" BYTEA,
    "image_mime_type" VARCHAR(50),
    "specs" JSONB,
    "created_by" UUID,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "configuration_data" JSONB NOT NULL,
    "is_validated" BOOLEAN NOT NULL DEFAULT false,
    "last_reminder_sent" TIMESTAMPTZ(6),
    "vehicle_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "user_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id","vehicle_id")
);

-- CreateTable
CREATE TABLE "known_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "device_id" TEXT NOT NULL,
    "device_label" TEXT,
    "last_ip" TEXT,
    "last_location" TEXT,
    "first_seen_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "known_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_email_otps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_email_otps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "cart_id" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'GBP',
    "stripe_checkout_session_id" TEXT,
    "stripe_payment_intent_id" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "processing_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "refunded_at" TIMESTAMP(6),
    "stripe_refund_id" TEXT,
    "receipt_sent_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" VARCHAR(30) NOT NULL,
    "message" TEXT NOT NULL,
    "related_id" UUID,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_permissions" (
    "user_id" UUID NOT NULL,
    "can_manage_vehicles" BOOLEAN NOT NULL DEFAULT true,
    "can_manage_orders" BOOLEAN NOT NULL DEFAULT true,
    "can_process_refunds" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_reviews" BOOLEAN NOT NULL DEFAULT true,
    "can_view_reports" BOOLEAN NOT NULL DEFAULT false,
    "can_manage_clients" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "known_devices_user_id_device_id_key" ON "known_devices"("user_id", "device_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_order_id_key" ON "reviews"("order_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "known_devices" ADD CONSTRAINT "known_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_email_otps" ADD CONSTRAINT "admin_email_otps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- Appendix BMW AutoSell : éléments non exprimables en Prisma
-- (CHECK constraints + index partiels soft-delete + index de recherche)
-- =============================================================================

-- CHECK constraints
ALTER TABLE "roles" ADD CONSTRAINT "roles_name_check" CHECK (name IN ('client', 'admin'));

ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_drivetrain_check"
  CHECK (drivetrain IN ('electric', 'hybrid', 'petrol', 'diesel', 'concept', 'protection'));

ALTER TABLE "orders" ADD CONSTRAINT "orders_processing_status_check"
  CHECK (processing_status IN ('pending', 'ready', 'delivered', 'cancelled'));

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_check" CHECK (rating BETWEEN 1 AND 5);

-- Index partiels soft-delete
CREATE INDEX IF NOT EXISTS idx_users_active ON users (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_purge ON users (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_active ON vehicles (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_purge ON vehicles (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_carts_active ON carts (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_carts_user ON carts (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_carts_purge ON carts (deleted_at) WHERE deleted_at IS NOT NULL;

-- Index de recherche / d'administration
CREATE INDEX IF NOT EXISTS idx_vehicles_category ON vehicles (category);
CREATE INDEX IF NOT EXISTS idx_vehicles_series ON vehicles (series);
CREATE INDEX IF NOT EXISTS idx_vehicles_drivetrain ON vehicles (drivetrain);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_vehicle ON reviews (vehicle_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_email_otps_user ON admin_email_otps (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications (is_read, created_at DESC);
