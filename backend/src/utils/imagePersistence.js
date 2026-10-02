const { isObjectStorageConfigured, putObject } = require('../services/objectStorage')

/**
 * Construit les colonnes image à partir d'un fichier téléversé.
 *
 * - bucket configuré  -> on écrit l'objet et on positionne image_key. Le BYTEA
 *                        est mis à NULL pour ne pas garder deux copies.
 * - bucket absent      -> repli historique en BYTEA, et image_key forcé à NULL.
 *
 * Le `image_key: null` du repli est délibéré : sans lui, une clé bucket
 * périmée continuerait d'être servie en priorité alors que l'admin vient
 * d'uploader une image par l'autre chemin.
 *
 * Le rejeu à `new Date()` ne sert qu'au cache-busting (Lot 8) : l'API l'ajoute
 * en query string à l'URL de l'image pour que le navigateur et le CDN
 * rechargent la nouvelle version malgré le `max-age=86400`.
 */
async function buildImageFields({ file, scope, id }) {
  if (!file) return {}

  const image_mime_type = file.mimetype
  const image_updated_at = new Date()

  if (isObjectStorageConfigured()) {
    const image_key = await putObject({
      scope,
      id,
      body: file.buffer,
      mimetype: file.mimetype,
    })
    return { image_key, image_data: null, image_mime_type, image_updated_at }
  }

  return { image_key: null, image_data: file.buffer, image_mime_type, image_updated_at }
}

module.exports = { buildImageFields }