require('dotenv').config()
const { Client } = require('pg')
const { dbConfig } = require('../db')

async function main() {
  const db = new Client({ ...dbConfig() })
  try {
    await db.connect()
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_token_hash TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS activation_expires_at TIMESTAMPTZ;
    `)
    await db.query(`
      UPDATE users
         SET is_active = TRUE
       WHERE is_active = FALSE AND activation_token_hash IS NULL
    `)
    await db.query(`
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
      )
    `)
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_email_otps (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash  TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `)
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_email_otps_user
        ON admin_email_otps (user_id, created_at DESC)
    `)
    // ---- VEHICULES (catalogue) ----
    await db.query(`
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS category VARCHAR(30) NOT NULL DEFAULT 'SUV';
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS series VARCHAR(10) NOT NULL DEFAULT 'X';
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS variant_label VARCHAR(50) NOT NULL DEFAULT 'Models';
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_new BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_electric BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_m_performance BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_url TEXT;
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT now();
      ALTER TABLE vehicles ALTER COLUMN base_price DROP NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_vehicles_category ON vehicles(category);
      CREATE INDEX IF NOT EXISTS idx_vehicles_series ON vehicles(series);
    `)
    // ---- VEHICULES (drivetrain : remplace is_electric) ----
    await db.query(`
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS drivetrain VARCHAR(20) NOT NULL DEFAULT 'petrol'
        CHECK (drivetrain IN ('electric','hybrid','petrol','diesel','concept','protection'))
    `)
    await db.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'vehicles' AND column_name = 'is_electric'
        ) THEN
          UPDATE vehicles SET drivetrain = 'electric' WHERE is_electric = true;
          ALTER TABLE vehicles DROP COLUMN is_electric;
        END IF;
      END $$;
    `)
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_vehicles_drivetrain ON vehicles(drivetrain);
    `)
    // ---- VEHICULES (admin : suppression du concept vendeur/partenaire) ----
    await db.query(`
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
      ALTER TABLE vehicles DROP COLUMN IF EXISTS vendor_id;
    `)
    await db.query(`
      ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_check;
    `)
    await db.query(`
      DELETE FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'vendeur');
      DELETE FROM roles WHERE name = 'vendeur';
    `)
    await db.query(`
      ALTER TABLE roles ADD CONSTRAINT roles_name_check CHECK (name IN ('client','admin'));
    `)
    // ---- PAIEMENT : panier lié à un véhicule + commandes Stripe ----
    // Le schéma legacy `orders` (total_amount/en_attente/shipping_address) n'a
    // jamais été utilisé (0 ligne) : on le recrée au format paiement Stripe.
    // Seule suppression possible si `orders` est encore au format legacy
    // (sinon `reviews`/`admin_notifications` en dépendent déjà).
    await db.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'orders' AND column_name = 'stripe_checkout_session_id'
        ) THEN
          DROP TABLE IF EXISTS order_items;
          DROP TABLE IF EXISTS orders;
        END IF;
      END $$;
    `)
    await db.query(`
      ALTER TABLE carts ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES vehicles(id);
    `)
    await db.query(`
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
        receipt_sent_at       TIMESTAMP,
        created_at            TIMESTAMP NOT NULL DEFAULT now()
      );
    `)
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    `)
    // ---- IMAGES VÉHICULES : upload en base (BYTEA) ----
    // NOTE : la colonne legacy `image_url` est conservée pour l'instant.
    // Sa suppression est gérée à part, par `npm run db:drop-image-url`,
    // UNIQUEMENT après avoir lancé `npm run import:images` (scripts/importVehicleImages.js).
    await db.query(`
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_data BYTEA;
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS image_mime_type VARCHAR(50);
    `)
    // ---- COMMANDES : statut de traitement + remboursement ----
    await db.query(`
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS processing_status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (processing_status IN ('pending','ready','delivered','cancelled'));
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;
      ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;
    `)
    // ---- AVIS CLIENTS ----
    await db.query(`
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
      )
    `)
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_vehicle
        ON reviews (vehicle_id, status, created_at DESC)
    `)
    // ---- NOTIFICATIONS ADMIN ----
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type       VARCHAR(30) NOT NULL,
        message    TEXT NOT NULL,
        related_id UUID,
        is_read    BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT now()
      )
    `)
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_admin_notifications_read
        ON admin_notifications (is_read, created_at DESC)
    `)
    // ---- ADMIN : profil (f/n, photo), super admin, permissions ----
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_data BYTEA;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_mime_type VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;
    `)
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_permissions (
        user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        can_manage_vehicles BOOLEAN NOT NULL DEFAULT TRUE,
        can_manage_orders   BOOLEAN NOT NULL DEFAULT TRUE,
        can_process_refunds BOOLEAN NOT NULL DEFAULT FALSE,
        can_manage_reviews  BOOLEAN NOT NULL DEFAULT TRUE,
        can_view_reports    BOOLEAN NOT NULL DEFAULT FALSE,
        can_manage_clients  BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at          TIMESTAMP NOT NULL DEFAULT now()
      )
    `)
    if (process.env.ADMIN_EMAIL) {
      await db.query(`
        UPDATE users
           SET is_super_admin = TRUE
         WHERE email = $1 AND role_id = (SELECT id FROM roles WHERE name = 'admin')
      `, [process.env.ADMIN_EMAIL])
    }
    console.log('Migration OK : admin (profil, photo, super admin, permissions).')
  } finally {
    await db.end()
  }
}

main().catch((err) => {
  console.error('db:migrate — échec :', err.message)
  process.exit(1)
})