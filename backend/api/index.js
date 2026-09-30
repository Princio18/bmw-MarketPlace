require('dotenv').config()
const app = require('../src/app')

// Vercel peut transmettre l'URL déjà dépouillée de son préfixe /api selon
// la forme de la rewrite. On la normalise pour que les routes montées sur
// /api/... de Express soient toujours atteintes.
module.exports = (req, res) => {
  if (typeof req.url === 'string' && !req.url.startsWith('/api')) {
    req.url = `/api${req.url}`
  }
  return app(req, res)
}
