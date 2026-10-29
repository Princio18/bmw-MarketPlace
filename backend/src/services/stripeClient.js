require('dotenv').config({ quiet: true })

// Valeurs de remplissage laissées dans les fichiers d'exemple : elles ne doivent
// JAMAIS être prises pour une vraie clé. Sans ce filtre, l'application tente un
// paiement avec une clé factice et l'erreur est déroutante.
const PLACEHOLDER_RE = /PLACEZ_ICI|VOTRE_CLE|your[_-]?key|changeme/i
const KNOWN_PREFIX_RE = /^(sk|rk)_(test|live)_/

const rawKey = String(process.env.STRIPE_SECRET_KEY || '').trim()
const isPlaceholder = rawKey === '' || PLACEHOLDER_RE.test(rawKey)

// Une clé non vide mais de préfixe inconnu n'est PAS rejetée : on la passe à
// Stripe, l'échec survient alors à l'usage (comportement voulu).
const stripe = isPlaceholder ? null : require('stripe')(rawKey)

function getStripe() {
  return stripe
}

function isStripeConfigured() {
  return stripe !== null
}

// Logs de démarrage : jamais la valeur de la clé, seulement son état.
if (!stripe) {
  console.warn(
    '[stripe] non configuré : STRIPE_SECRET_KEY absent ou placeholder.',
  )
} else {
  if (!KNOWN_PREFIX_RE.test(rawKey)) {
    console.warn(
      "[stripe] préfixe de clé inattendu : le paiement échouera à l'usage.",
    )
  }
  if (!String(process.env.STRIPE_WEBHOOK_SECRET || '').trim()) {
    console.warn(
      '[stripe] STRIPE_WEBHOOK_SECRET absent : les commandes resteront en "pending" après paiement.',
    )
  }
  console.log('[stripe] configuré (clé test/live détectée).')
}

module.exports = { getStripe, isStripeConfigured, stripe }
