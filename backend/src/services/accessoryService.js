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
    -- image_data sert encore de repli, mais l'image peut désormais vivre dans
    -- le bucket : ne considérer l'accessoire "sans image" que si les DEUX
    -- sources sont vides, sinon l'admin afficherait un placeholder à tort.
    (a.image_data IS NOT NULL OR a.image_key IS NOT NULL) AS "hasImage",
    -- Version d'image ajoutée en query string : sans elle, remplacer une image
    -- ne changerait pas l'URL et le navigateur servirait l'ancienne pendant
    -- toute la durée du max-age (24 h). COALESCE car toutes les lignes
    -- existantes ont image_updated_at NULL, et NULL concaténé donnerait une
    -- URL littéralement nulle. Reste un chemin relatif.
    '/api/accessories/' || a.id || '/image?v='
      || COALESCE((EXTRACT(EPOCH FROM a.image_updated_at) * 1000)::bigint, 0) AS "image",
    (a.stock_quantity > 0) AS "inStock",
    a.created_at AS "createdAt",
    a.deleted_at AS "deletedAt"
  FROM accessories a
`

// SELECT public : jamais de BYTEA ni de clé d'objet dans la liste (poids inutile
// de la requête), l'image est exposée via son URL.
const ACCESSORY_LIST_SELECT = ACCESSORY_SELECT.replace(
  '(a.image_data IS NOT NULL OR a.image_key IS NOT NULL) AS "hasImage",\n    ',
  '',
)

// SELECT de détail (admin) : ACCESSORY_SELECT + les véhicules rattachés, pour
// pré-remplir le formulaire d'édition. Volontairement distinct de
// ACCESSORY_LIST_SELECT : la sous-requête n'a aucun sens sur les listes.
const ACCESSORY_DETAIL_SELECT = ACCESSORY_SELECT.replace(
  '  FROM accessories a',
  `  , ARRAY(
       SELECT va.vehicle_id
         FROM vehicle_accessories va
        WHERE va.accessory_id = a.id
     ) AS "vehicleIds"
  FROM accessories a`,
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
// Sans `vehicleId` : tout le catalogue (panier, admin, clients).
// Avec `vehicleId` : uniquement les accessoires rattachés à ce véhicule
// (onglet « Options » du configurateur).
async function listActiveAccessories({ vehicleId } = {}) {
  if (vehicleId) {
    const rows = await prisma.$queryRawUnsafe(
      `${ACCESSORY_LIST_SELECT}
       JOIN vehicle_accessories va ON va.accessory_id = a.id
       WHERE va.vehicle_id = $1 AND a.deleted_at IS NULL
       ORDER BY a.created_at ASC`,
      vehicleId,
    )
    return pgSafe(rows)
  }
  const rows = await prisma.$queryRawUnsafe(
    `${ACCESSORY_LIST_SELECT} WHERE a.deleted_at IS NULL ORDER BY a.created_at ASC`,
  )
  return pgSafe(rows)
}

// Remplace l'ENSEMBLE des liaisons d'un véhicule (l'admin envoie la liste
// complète à cocher). Vérifie d'abord que chaque id correspond à un accessoire
// actif : sans ce filtre, un id inconnu ferait échouer la FK et remonterait une
// 500 au lieu d'un message clair.
// Retourne { invalid, unknown } — deux listes vides si tout est bon.
async function setVehicleAccessories(vehicleId, accessoryIds) {
  const { valid, invalid } = splitIds(accessoryIds)
  let unique = [...new Set(valid)]

  let unknown = []
  if (unique.length > 0) {
    const found = await prisma.$queryRawUnsafe(
      `SELECT id, deleted_at IS NOT NULL AS "deleted"
         FROM accessories
        WHERE id = ANY($1::uuid[])`,
      unique,
    )
    const known = new Set(found.map((row) => row.id))
    const deleted = new Set(
      found.filter((row) => row.deleted).map((row) => row.id),
    )
    unknown = unique.filter((id) => !known.has(id))
    // Un accessoire supprimé (soft-delete) peut rester rattaché dans les
    // données : on l'ignore. Sans ce filtre, `unknown` le remonterait et le
    // PUT /admin/vehicles/:id/accessories renverrait un 400 qui bloquerait
    // TOUTE la sauvegarde du véhicule, sans que l'admin ait fait quoi que ce
    // soit de mal.
    unique = unique.filter((id) => !deleted.has(id))
  }

  if (invalid.length > 0 || unknown.length > 0) {
    return { invalid, unknown }
  }

  await prisma.$transaction([
    prisma.$executeRawUnsafe(
      `DELETE FROM vehicle_accessories WHERE vehicle_id = $1`,
      vehicleId,
    ),
    ...unique.map((accessoryId) =>
      prisma.$executeRawUnsafe(
        `INSERT INTO vehicle_accessories (vehicle_id, accessory_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        vehicleId,
        accessoryId,
      ),
    ),
  ])

  return { invalid: [], unknown: [] }
}

// Remplace l'ENSEMBLE des véhicules sur lesquels un accessoire apparaît.
// Miroir exact de setVehicleAccessories : l'admin envoie la liste complète des
// véhicules cochés, le serveur remplace les liaisons dans une transaction.
// Retourne { invalid, unknown } — deux listes vides si tout est bon.
async function setAccessoryVehicles(accessoryId, vehicleIds) {
  const { valid, invalid } = splitIds(vehicleIds)
  const unique = [...new Set(valid)]

  let unknown = []
  if (unique.length > 0) {
    const found = await prisma.$queryRawUnsafe(
      `SELECT id FROM vehicles WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL`,
      unique,
    )
    const known = new Set(found.map((row) => row.id))
    unknown = unique.filter((id) => !known.has(id))
  }

  if (invalid.length > 0 || unknown.length > 0) {
    return { invalid, unknown }
  }

  await prisma.$transaction([
    prisma.$executeRawUnsafe(
      `DELETE FROM vehicle_accessories WHERE accessory_id = $1`,
      accessoryId,
    ),
    ...unique.map((vehicleId) =>
      prisma.$executeRawUnsafe(
        `INSERT INTO vehicle_accessories (vehicle_id, accessory_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        vehicleId,
        accessoryId,
      ),
    ),
  ])

  return { invalid: [], unknown: [] }
}

// Ids d'accessoires NON rattachés au véhicule (parmi ceux demandés). Au
// checkout : un id non rattaché (manipulation du panier) doit être refusé.
async function findUnassignedAccessoryIds(vehicleId, ids) {
  const { valid } = splitIds(ids)
  const unique = [...new Set(valid)]
  if (unique.length === 0) return []
  const rows = await prisma.$queryRawUnsafe(
    `SELECT accessory_id AS "accessoryId"
       FROM vehicle_accessories
      WHERE vehicle_id = $1 AND accessory_id = ANY($2::uuid[])`,
    vehicleId,
    unique,
  )
  const assigned = new Set(rows.map((row) => row.accessoryId))
  return unique.filter((id) => !assigned.has(id))
}

// Liste admin : inclut les soft-deleted, avec l'indicateur hasImage.
async function listAllAccessories() {
  const rows = await prisma.$queryRawUnsafe(
    `${ACCESSORY_SELECT} ORDER BY a.deleted_at ASC NULLS FIRST, a.created_at DESC`,
  )
  return pgSafe(rows)
}

async function findAccessoryById(id) {
  const rows = await prisma.$queryRawUnsafe(`${ACCESSORY_DETAIL_SELECT} WHERE a.id = $1`, id)
  return rows.length ? pgSafe(rows[0]) : null
}

async function findAccessoryImage(id) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT image_key AS "imageKey",
            image_data AS "imageData",
            image_mime_type AS "imageMimeType"
     FROM accessories
     WHERE id = $1 AND deleted_at IS NULL`,
    id,
  )
  if (!rows.length) return null
  // Pas de pgSafe ici : le BYTEA doit rester un Buffer. JSON.stringify le
  // convertirait en { type: 'Buffer', data: [...] } et res.send enverrait du
  // JSON au lieu de l'image. Même raison que getVehicleImage côté véhicules.
  const row = rows[0]
  return {
    imageKey: row.imageKey,
    imageData: row.imageData,
    imageMimeType: row.imageMimeType,
  }
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
  setVehicleAccessories,
  setAccessoryVehicles,
  findUnassignedAccessoryIds,
  listAllAccessories,
  findAccessoryById,
  findAccessoryImage,
  resolveAccessories,
  decrementStock,
}
