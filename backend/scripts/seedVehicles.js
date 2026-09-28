require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { closePool, query } = require('../src/db')

const PUBLIC_ROOT = path.join(__dirname, '..', '..', 'frontend', 'public')

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
}

const IMG = (slug) => `/images/vehicles/${slug}.png`

function readVehicleImage(imageUrl) {
  if (!imageUrl) return { buffer: null, mimeType: null }
  const filePath = path.join(PUBLIC_ROOT, imageUrl)
  if (!fs.existsSync(filePath)) return { buffer: null, mimeType: null }
  const mimeType = MIME_BY_EXT[path.extname(filePath).toLowerCase()]
  if (!mimeType) return { buffer: null, mimeType: null }
  return { buffer: fs.readFileSync(filePath), mimeType }
}

const VEHICLES = [
  // --- Électriques (catalogue X) ---
  { modelName: 'iX', variantLabel: 'Models', category: 'SUV', series: 'X', drivetrain: 'electric', isNew: false, isMPerformance: false, basePrice: 75405, slug: 'ix' },
  { modelName: 'iX', variantLabel: 'M Model', category: 'SUV', series: 'X', drivetrain: 'electric', isNew: false, isMPerformance: true, basePrice: 114305, slug: 'ix-m' },
  { modelName: 'iX5', variantLabel: 'Models', category: 'SUV', series: 'X', drivetrain: 'electric', isNew: true, isMPerformance: false, basePrice: null, slug: 'ix5' },
  { modelName: 'iX3', variantLabel: 'Models', category: 'SUV', series: 'X', drivetrain: 'electric', isNew: true, isMPerformance: false, basePrice: 64955, slug: 'ix3' },
  { modelName: 'iX2', variantLabel: 'Models', category: 'SUV', series: 'X', drivetrain: 'electric', isNew: false, isMPerformance: false, basePrice: 41700, slug: 'ix2' },
  { modelName: 'iX1', variantLabel: 'Models', category: 'SUV', series: 'X', drivetrain: 'electric', isNew: false, isMPerformance: false, basePrice: 39610, slug: 'ix1' },
  // --- Nouvelles catégories (Plan 2) ---
  { modelName: 'BMW 330e', variantLabel: 'Models', category: 'Saloon', series: '3', drivetrain: 'hybrid', isNew: false, isMPerformance: false, basePrice: 46000, slug: '330e' },
  { modelName: 'BMW M340i', variantLabel: 'Models', category: 'Saloon', series: '3', drivetrain: 'petrol', isNew: false, isMPerformance: true, basePrice: 52500, slug: 'm340i' },
  { modelName: 'BMW 520d', variantLabel: 'Models', category: 'Saloon', series: '5', drivetrain: 'diesel', isNew: false, isMPerformance: false, basePrice: 48200, slug: '520d' },
  { modelName: 'BMW Concept XM', variantLabel: 'Models', category: 'SUV', series: 'X', drivetrain: 'concept', isNew: true, isMPerformance: false, basePrice: null, slug: 'concept-xm' },
  { modelName: 'BMW 7 Series Protection', variantLabel: 'Models', category: 'Saloon', series: '7', drivetrain: 'protection', isNew: false, isMPerformance: false, basePrice: 118000, slug: '7-series-protection' },
]

async function run() {
  const { rows } = await query(
    "SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'admin') ORDER BY created_at ASC LIMIT 1",
  )
  if (rows.length === 0) {
    console.error("[seed:vehicles] Aucun admin trouvé. Lancez npm run seed:admin d'abord.")
    process.exit(1)
  }
  const adminId = rows[0].id

  let vehiclesInserted = 0
  let vehiclesExisting = 0

  for (const v of VEHICLES) {
    const exists = await query(
      'SELECT id FROM vehicles WHERE model_name = $1 AND variant_label = $2',
      [v.modelName, v.variantLabel],
    )
    if (exists.rows.length > 0) {
      vehiclesExisting += 1
      continue
    }
    const { buffer, mimeType } = readVehicleImage(IMG(v.slug))
    await query(
      `INSERT INTO vehicles
         (model_name, category, series, variant_label, drivetrain,
          is_new, is_m_performance, base_price, image_data, image_mime_type, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        v.modelName,
        v.category,
        v.series,
        v.variantLabel,
        v.drivetrain,
        v.isNew,
        v.isMPerformance,
        v.basePrice,
        buffer,
        mimeType,
        adminId,
      ],
    )
    vehiclesInserted += 1
  }

  console.log(
    `[seed:vehicles] Résumé : véhicules insérés ${vehiclesInserted}, déjà existants ${vehiclesExisting}.`,
  )
}

run()
  .then(async () => {
    await closePool()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error('[seed:vehicles] Erreur inattendue :', err)
    try {
      await closePool()
    } catch {
      // pool déjà fermé
    }
    process.exit(1)
  })