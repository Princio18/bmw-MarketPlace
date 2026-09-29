require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

// Client Prisma unique pour toute l'application, connecté via le driver
// adapter node-postgres (pg). DATABASE_URL pointe vers la base Neon.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Prisma renvoie les colonnes BIGINT (ex. COUNT(*)) sous forme de BigInt, non
// sérialisable en JSON. PostgreSQL (node-pg) les renvoyait sous forme de
// chaînes : on reproduit ce format pour rester iso-comportement avec l'API.
function bigintToString(_key, value) {
  return typeof value === 'bigint' ? value.toString() : value
}

// Rend une valeur (ligne/objet/tableau) sérialisable en JSON à l'identique du
// comportement historique : BigInt -> chaîne, Decimal -> chaîne (toJSON), etc.
function pgSafe(value) {
  return JSON.parse(JSON.stringify(value, bigintToString))
}

async function closeDb() {
  return prisma.$disconnect()
}

module.exports = { prisma, pgSafe, closeDb }
