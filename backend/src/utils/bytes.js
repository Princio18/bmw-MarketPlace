/**
 * Normalise une colonne BYTEA Prisma en Buffer avant envoi HTTP.
 *
 * Selon la façon dont la valeur est lue, Prisma + driver adapter pg peut
 * renvoyer le BYTEA sous trois formes :
 *   - Buffer                (pg natif)
 *   - { type: 'Buffer', data: [...] }   (sérialisation JSON)
 *   - { 0: 137, 1: 80, ... }            ( objet indexé )
 *
 * Dans les deux derniers cas, `res.send()` sérialise l'objet en JSON et sert
 * une réponse illisible sous un Content-Type d'image : le navigateur échoue au
 * décodage et bascule sur le placeholder. D'où cette normalisation unique.
 */
function toBuffer(value) {
  if (!value) return null
  if (Buffer.isBuffer(value)) return value
  if (value.type === 'Buffer' && Array.isArray(value.data)) return Buffer.from(value.data)
  if (Array.isArray(value)) return Buffer.from(value)
  if (typeof value === 'object') return Buffer.from(Object.values(value))
  return null
}

module.exports = { toBuffer }