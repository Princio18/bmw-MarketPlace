require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { closePool, query } = require('../src/db')

// ==========================================================================
// Imports les images déjà présentes dans frontend/public (via image_url)
// vers les colonnes BYTEA image_data/image_mime_type de la table vehicles.
// Exécution MANUELLE :  npm run import:images
// Jamais exécuté automatiquement. Après exécution :
//    npm run db:drop-image-url   (supprime la colonne legacy image_url)
// ==========================================================================

const PUBLIC_ROOT = path.join(__dirname, '..', '..', 'frontend', 'public')

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

async function run() {
  const { rows } = await query(
    `SELECT id, model_name AS "modelName", image_url AS "imageUrl"
       FROM vehicles
      WHERE image_url IS NOT NULL AND image_url <> ''`,
  )

  let imported = 0
  let ignored = 0

  for (const vehicle of rows) {
    const imageUrl = vehicle.imageUrl
    const filePath = path.join(PUBLIC_ROOT, imageUrl)
    const ext = path.extname(filePath).toLowerCase()

    if (!fs.existsSync(filePath)) {
      console.warn(`[import-images] fichier introuvable pour ${vehicle.modelName}, ignoré.`)
      ignored += 1
      continue
    }

    const mimeType = MIME_BY_EXT[ext]
    if (!mimeType) {
      console.warn(`[import-images] extension inconnue pour ${vehicle.modelName}, ignoré.`)
      ignored += 1
      continue
    }

    const buffer = fs.readFileSync(filePath)
    await query(
      `UPDATE vehicles SET image_data = $1, image_mime_type = $2 WHERE id = $3`,
      [buffer, mimeType, vehicle.id],
    )
    imported += 1
  }

  console.log(
    `[import-images] Résumé : ${imported} importé(s), ${ignored} ignoré(s), ` +
      `${rows.length} véhicule(s) avec image_url.`,
  )
}

run()
  .then(async () => {
    await closePool()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('[import-images] Erreur inattendue :', err)
    try {
      await closePool()
    } catch {
      // pool déjà fermé
    }
    process.exit(1)
  })