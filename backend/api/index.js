require('dotenv').config()
const app = require('../src/app')

// Vercel peut transmettre l'URL deja depouillee de son prefixe /api selon
// la forme de la rewrite. On la normalise pour que les routes montees sur
// /api/... de Express soient toujours atteintes.
module.exports = (req, res) => {
  if (typeof req.url === 'string' && !req.url.startsWith('/api')) {
    req.url = `/api${req.url}`
  }
  return app(req, res)
}