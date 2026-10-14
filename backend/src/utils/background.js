// Exécution « en arrière-plan » compatible avec les fonctions serverless
// Vercel : waitUntil() maintient l'invocation en vie jusqu'à la résolution de
// la promesse (emails, notifications), même après l'envoi de la réponse HTTP.
// En dehors de Vercel (dev local, tests), le module peut être absent : on
// retombe alors sur une simple promesse dont les erreurs sont journalisées.
let waitUntil
try {
  ;({ waitUntil } = require('@vercel/functions'))
} catch {
  waitUntil = undefined
}

function background(promise) {
  const p = Promise.resolve(promise).catch((e) =>
    console.error('[background]', e),
  )
  if (waitUntil) {
    // Hors contexte de requête Vercel (dev local, cron), waitUntil peut lever :
    // on l'ignore, la promesse continue simplement à s'exécuter.
    try {
      waitUntil(p)
    } catch {
      /* pas de contexte Vercel actif */
    }
  }
  return p
}

module.exports = { background }
