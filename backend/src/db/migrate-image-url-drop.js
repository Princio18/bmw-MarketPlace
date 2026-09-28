require('dotenv').config()
const { Client } = require('pg')
const { dbConfig } = require('../db')

// ==========================================================================
// !!! MIGRATION À EXÉCUTER EN DERNIER — À LA MAIN, UNIQUEMENT APRÈS AVOIR    !
// !!! LANCÉ :  npm run import:images                                         !
// !!!                                                                        !
// !!! scripts/importVehicleImages.js copie les images (image_url →           !
// !!! image_data/image_mime_type) DANS LA BASE, puis CE script retire         !
// !!! la colonne legacy `image_url`. L'inverse briserait les images.          !
// ==========================================================================

async function main() {
  const db = new Client({ ...dbConfig() })
  try {
    await db.connect()

    const { rows } = await db.query(
      `SELECT COUNT(*) AS total,
              SUM((image_data IS NOT NULL)::int) AS with_image
         FROM vehicles
        WHERE image_url IS NOT NULL`,
    )
    const { total, with_image } = rows[0] || { total: 0, with_image: 0 }

    if (Number(total) > 0 && Number(with_image) < Number(total)) {
      console.error(
        `[db:drop-image-url] ABANDON : ${total} véhicule(s) ont encore image_url ` +
          `mais seulement ${with_image} ont une image importée. ` +
          `Lancez d'abord : npm run import:images`,
      )
      process.exit(1)
    }

    await db.query('ALTER TABLE vehicles DROP COLUMN IF EXISTS image_url')
    console.log('[db:drop-image-url] Colonne image_url supprimée de vehicles.')
  } finally {
    await db.end()
  }
}

main().catch((err) => {
  console.error('db:drop-image-url — échec :', err.message)
  process.exit(1)
})