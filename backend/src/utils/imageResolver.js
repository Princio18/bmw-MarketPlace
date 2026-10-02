const { isObjectStorageConfigured, getObjectAsBuffer } = require('../services/objectStorage')
const { toBuffer } = require('./bytes')

/**
 * Résout les octets d'une image quelle que soit sa source.
 *
 * Priorité au stockage objet, repli sur le BYTEA historique. Ce repli est
 * volontaire pendant la transition : il permet de déployer le code de lecture
 * AVANT que le bucket soit configuré, sans jamais casser l'affichage. Il reste
 * aussi le filet si le service (encore en bêta) devient indisponible.
 *
 * Retourne null quand aucune source n'a d'image : à l'appelant de rediriger
 * vers son placeholder.
 */
async function resolveImage({ imageKey, imageData, imageMimeType, scope, id }) {
  if (imageKey && isObjectStorageConfigured()) {
    try {
      const { buffer, contentType } = await getObjectAsBuffer(imageKey)
      return {
        buffer,
        contentType: contentType || imageMimeType || 'application/octet-stream',
        source: 'bucket',
      }
    } catch (err) {
      // Objet absent ou bucket momentanément injoignable : on ne casse pas
      // l'affichage, on retombe sur le BYTEA s'il existe encore.
      console.error(
        `[image] lecture bucket impossible pour ${scope}/${id} (${imageKey}) :`,
        err.message,
      )
    }
  }

  const buffer = toBuffer(imageData)
  if (buffer) {
    return { buffer, contentType: imageMimeType, source: 'bytea' }
  }

  return null
}

module.exports = { resolveImage }