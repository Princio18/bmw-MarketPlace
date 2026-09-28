-- BMW AutoSell — Soft Delete & RGPD
-- Structure officielle (UUID + roles + favorites + orders).
-- Aucune ligne supprimée ne disparaît : flag deleted_at sur users/vehicles/carts.
-- Purge définitive (Hard Delete) après 90 jours exécutée quotidiennement par
-- src/jobs/purgeExpired.js (node-cron, 03:00).
-- orders sont conservées pour la comptabilité (jamais purgées) :
-- user_id / vehicle_id ne sont pas supprimés en cascade (blocage volontaire).

-- 1. RÔLES ET UTILISATEURS
CREATE TABLE IF NOT EXISTS roles (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE CHECK (name IN ('client', 'admin'))
);

CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name            VARCHAR(100) NOT NULL DEFAULT '',
  last_name             VARCHAR(100) NOT NULL DEFAULT '',
  email                 VARCHAR(255) NOT NULL UNIQUE,
  password_hash         TEXT NOT NULL,
  role_id               INT REFERENCES roles(id),
  two_factor_secret     TEXT,
  is_two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_active             BOOLEAN NOT NULL DEFAULT FALSE,
  activation_token_hash TEXT,
  activation_expires_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_active ON users (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_purge  ON users (deleted_at) WHERE deleted_at IS NOT NULL;

-- 2. VÉHICULES ET CONFIGURATIONS 3D
CREATE TABLE IF NOT EXISTS vehicles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name        VARCHAR(100) NOT NULL,
  base_price        DECIMAL(10, 2),
  category          VARCHAR(30) NOT NULL DEFAULT 'SUV',
  series            VARCHAR(10) NOT NULL DEFAULT 'X',
  variant_label     VARCHAR(50) NOT NULL DEFAULT 'Models',
  is_new            BOOLEAN NOT NULL DEFAULT FALSE,
  is_m_performance  BOOLEAN NOT NULL DEFAULT FALSE,
  drivetrain        VARCHAR(20) NOT NULL DEFAULT 'petrol'
                    CHECK (drivetrain IN ('electric','hybrid','petrol','diesel','concept','protection')),
  image_data        BYTEA,
  image_mime_type   VARCHAR(50),
  specs             JSONB,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vehicles_active    ON vehicles (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_purge     ON vehicles (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_category  ON vehicles (category);
CREATE INDEX IF NOT EXISTS idx_vehicles_series    ON vehicles (series);
CREATE INDEX IF NOT EXISTS idx_vehicles_drivetrain ON vehicles (drivetrain);

-- 3. PANIER (configuration 3D) ET FAVORIS
CREATE TABLE IF NOT EXISTS carts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  configuration_data  JSONB NOT NULL,
  is_validated        BOOLEAN NOT NULL DEFAULT FALSE,
  last_reminder_sent  TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_carts_active ON carts (id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_carts_user   ON carts (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_carts_purge  ON carts (deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS favorites (
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, vehicle_id)
);

-- 4. APPAREILS CONNUS (alerte de connexion)
CREATE TABLE IF NOT EXISTS known_devices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id      TEXT NOT NULL,
  device_label   TEXT,
  last_ip        TEXT,
  last_location  TEXT,
  first_seen_at  TIMESTAMP NOT NULL DEFAULT now(),
  last_seen_at   TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

-- 4.5 CODES DE SECOURS EMAIL (2FA admin)
CREATE TABLE IF NOT EXISTS admin_email_otps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_email_otps_user ON admin_email_otps (user_id, created_at DESC);

-- 4. COMMANDES ET HISTORIQUE (conservés — comptabilité)
-- Structure Stripe : statut piloté UNIQUEMENT par le webhook Stripe.
-- `amount` est en livres (DECIMAL), jamais en pence.
CREATE TABLE IF NOT EXISTS orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id),
  vehicle_id            UUID NOT NULL REFERENCES vehicles(id),
  cart_id               UUID REFERENCES carts(id),
  amount                DECIMAL(10, 2) NOT NULL,
  currency              VARCHAR(3) NOT NULL DEFAULT 'GBP',
  stripe_checkout_session_id TEXT,
  stripe_payment_intent_id   TEXT,
  status                VARCHAR(20) NOT NULL DEFAULT 'pending',
  processing_status     VARCHAR(20) NOT NULL DEFAULT 'pending'
                        CHECK (processing_status IN ('pending','ready','delivered','cancelled')),
  refunded_at           TIMESTAMP,
  stripe_refund_id      TEXT,
  receipt_sent_at       TIMESTAMP,
  created_at            TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user   ON orders(user_id);

-- 4.5 AVIS CLIENTS (les avis publics ne révèlent jamais email/nom du client)
CREATE TABLE IF NOT EXISTS reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  order_id   UUID NOT NULL UNIQUE REFERENCES orders(id),
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  status     VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP DEFAULT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_vehicle
  ON reviews (vehicle_id, status, created_at DESC);

-- 4.6 NOTIFICATIONS ADMIN
CREATE TABLE IF NOT EXISTS admin_notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       VARCHAR(30) NOT NULL,
  message    TEXT NOT NULL,
  related_id UUID,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read
  ON admin_notifications (is_read, created_at DESC);