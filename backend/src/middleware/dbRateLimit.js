const { prisma } = require('../db')

// Limitation de débit partagée entre instances serverless : un compteur en
// mémoire (express-rate-limit) ne survit pas d'une invocation Vercel à l'autre.
// On stocke donc le compteur en base, l'upsert atomique garantissant que les
// hits sont cumulés même sous concurrence.
//
// Retourne un middleware Express :
//   - incrémente le compteur pour `key = name:keyFn(req)` ;
//   - remet le compteur à 1 si la fenêtre précédente est expirée ;
//   - répond 429 dès que le nombre de hits dépasse `max`.
function dbRateLimit({ name, windowMs, max, keyFn }) {
  const windowSecs = Math.max(1, Math.round(windowMs / 1000))

  return async function rateLimitMiddleware(req, res, next) {
    let key
    try {
      const suffix = String(keyFn(req) ?? '')
      key = suffix ? `${name}:${suffix}` : name
    } catch {
      key = name
    }

    try {
      const rows = await prisma.$queryRawUnsafe(
        `INSERT INTO rate_limits (key, hits, reset_at)
         VALUES ($1, 1, now() + make_interval(secs => $2))
         ON CONFLICT (key) DO UPDATE SET
           hits = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.hits + 1 END,
           reset_at = CASE WHEN rate_limits.reset_at < now()
                           THEN now() + make_interval(secs => $2)
                           ELSE rate_limits.reset_at END
         RETURNING hits`,
        key,
        windowSecs,
      )
      const hits = Number(rows?.[0]?.hits ?? 1)
      if (hits > max) {
        return res
          .status(429)
          .json({ error: 'Too many requests. Please try again later.' })
      }
    } catch (err) {
      // Une panne de la base ne doit pas bloquer l'authentification : on laisse
      // passer plutôt que de verrouiller tous les utilisateurs (fail-open).
      console.error('[rate-limit] échec du compteur en base :', err.message)
    }

    return next()
  }
}

module.exports = { dbRateLimit }
