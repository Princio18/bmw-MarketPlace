const { prisma, pgSafe } = require('../db')

// Un identifiant d'accessoire est un UUID : on filtre les valeurs malformées
// AVANT de les passer à Postgres, sinon un simple id corrompu dans la config
// ferait échouer toute la requête (`invalid input syntax for type uuid`).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Garde-fou pour les handlers : sans cela, un id non-UUID dans l'URL fait
// échouer la requête Postgres (« invalid input syntax for type uuid ») et
// remonte une 500 au lieu d'un 404.
function isValidAccessoryId(id) {
  return typeof id === 'string' && UUID_RE.test(id.trim())
}

const ACCESSORY_SELECT = `
  SELECT
    a.id,
    a.name,
    a.description,
    a.price::float8 AS "price",
    a.badge,
    a.requires_adjustment AS "requiresAdjustment",
    a.stock_quantity::int AS "stockQuantity",
    a.image_data IS NOT NULL AS "hasImage",
    '/api/accessories/' || a.id || '/image' AS "image",
    (a.stock_quantity > 0) AS "inStock",
    a.created_at AS "createdAt",
    a.deleted_at AS "deletedAt"
  FROM accessories a
`

// SELECT public : jamais de BYTEA dans la liste (poids useless de la requête),
// l'image est exposée via son URL.
const ACCESSORY_LIST_SELECT = ACCESSORY_SELECT.replace(
  'a.image_data IS NOT NULL AS "hasImage",\n    ',
  '',
)

// Sépare les ids en deux lots : ceux qu'on peut envoyer à Postgres (UUID) et
// ceux qui sont mal formés. Les valeurs vides / nulles sont simplement ignorées
// (configuration partielle), mais une valeur non vide qui n'est pas un UUID est
// signalée : on ne peut pas deviner quel accessoire l'utilisateur voulait, et
// la laisser passer reviendrait à le facturer sans rien lui livrer.
function splitIds(ids) {
  const valid = []
  const invalid = []
  if (!Array.isArray(ids)) return { valid, invalid }
  for (const id of ids) {
    if (id === undefined || id === null) continue
    if (typeof id !== 'string') {
      invalid.push(id)
      continue
    }
    const trimmed = id.trim()
    if (trimmed === '') continue
    if (UUID_RE.test(trimmed)) valid.push(trimmed)
    else invalid.push(trimmed)
  }
  return { valid, invalid }
}

// Liste publique : uniquement les accessoires actifs.
async function listActiveAccessories() {
  const rows = await prisma.$queryRawUnsafe(
    `${ACCESSORY_LIST_SELECT} WHERE a.deleted_at IS NULL ORDER BY a.created_at ASC`,
  )
  return pgSafe(rows)
}

// Liste admin : inclut les soft-deleted, avec l'indicateur hasImage.
async function listAllAccessories() {
  const rows = await prisma.$queryRawUnsafe(
    `${ACCESSORY_SELECT} ORDER BY a.deleted_at ASC NULLS FIRST, a.created_at DESC`,
  )
  return pgSafe(rows)
}

async function findAccessoryById(id) {
  const rows = await prisma.$queryRawUnsafe(`${ACCESSORY_SELECT} WHERE a.id = $1`, id)
  return rows.length ? pgSafe(rows[0]) : null
}

async function findAccessoryImage(id) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT image_data AS "imageData", image_mime_type AS "imageMimeType"
     FROM accessories
     WHERE id = $1 AND deleted_at IS NULL`,
    id,
  )
  if (!rows.length) return null
  // Pas de pgSafe ici : le BYTEA doit rester un Buffer. JSON.stringify le
  // convertirait en { type: 'Buffer', data: [...] } et res.send enverrait du
  // JSON au lieu de l'image. Même raison que getVehicleImage côté véhicules.
  const row = rows[0]
  return { imageData: row.imageData, imageMimeType: row.imageMimeType }
}

// Recharge les accessoires DEPUIS LA BASE à partir des ids sélectionnés dans
// le panier. Les prix du frontend ne sont jamais lus : seule la base fait foi.
// Retourne les lignes trouvées (dans l'ordre des ids demandés) et la liste des
// ids introuvables (inconnus ou soft-deleted).
async function resolveAccessories(ids) {
  const { valid, invalid } = splitIds(ids)
  // `invalid` est déjà en failed : un id mal formé est exactement autant un
  // accessoire « non disponible » qu'un id absent de la table.
  if (valid.length === 0) {
    return { items: [], missing: invalid }
  }

  const rows = await prisma.$queryRawUnsafe(
    `${ACCESSORY_LIST_SELECT} WHERE a.id = ANY($1::uuid[]) AND a.deleted_at IS NULL`,
    valid,
  )
  const byId = new Map(pgSafe(rows).map((row) => [row.id, row]))

  const items = []
  const missing = [...invalid]
  const seen = new Set()
  for (const id of valid) {
    if (seen.has(id)) continue
    seen.add(id)
    const row = byId.get(id)
    if (row) items.push(row)
    else missing.push(id)
  }
  return { items, missing }
}

// Décrémente le stock d'une unité. SEUL point d'écriture du stock.
// Retourne { stockQuantity, name } — stockQuantity à 0 signifie « rupture »,
// et déclenche une notification admin chez l'appelant.
// Retourne null si l'id est mal formé ou introuvable (jamais de throw : le
// webhook appelle ceci sur des ids venus du panier, donc du JSON contrôlé par
// l'utilisateur).
async function decrementStock(id) {
  if (!isValidAccessoryId(id)) return null
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE accessories
        SET stock_quantity = GREATEST(stock_quantity - 1, 0)
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING stock_quantity::int AS "stockQuantity", name`,
    id.trim(),
  )
  return rows.length ? pgSafe(rows[0]) : null
}

module.exports = {
  isValidAccessoryId,
  listActiveAccessories,
  listAllAccessories,
  findAccessoryById,
  findAccessoryImage,
  resolveAccessories,
  decrementStock,
}
