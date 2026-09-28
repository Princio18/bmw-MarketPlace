const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null

function getStripe() {
  return stripe
}

module.exports = { getStripe, stripe }