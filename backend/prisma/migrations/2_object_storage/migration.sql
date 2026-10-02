-- Migration vers le stockage objet (Neon Object Storage, S3-compatible).
--
-- `image_key` reçoit la clé d'objet RELATIVE (`vehicles/<uuid>.png`), jamais une
-- URL : le frontend continue de consommer `/api/.../<id>/image` et ignore donc
-- complètement d'où viennent les octets.
--
-- `image_data` / `image_mime_type` (BYTEA) sont CONSERVÉS comme repli pendant la
-- transition. La route image lit le bucket d'abord et ne retombe sur le BYTEA
-- que si `image_key` est NULL. Les colonnes seront supprimées dans une
-- migration ultérieure, une fois la bascule validée.
--
-- `image_updated_at` n'est pas un simple `updated_at` : il ne change QUE quand
-- l'image change. S'appuyer sur `updated_at` invaliderait le cache CDN à chaque
-- édition de prix ou de description, pour rien.

-- AlterTable
ALTER TABLE "vehicles"
    ADD COLUMN "image_key" TEXT,
    ADD COLUMN "image_updated_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "accessories"
    ADD COLUMN "image_key" TEXT,
    ADD COLUMN "image_updated_at" TIMESTAMPTZ(6);