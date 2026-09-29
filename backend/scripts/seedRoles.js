require('dotenv').config()

const { closeDb, prisma } = require('../src/db')
const { ROLES } = require('../src/roles')

// Roles de reference : indispensables aux inscriptions clients et a la
// connexion admin. Sur une base neuve (migration 0_init) la table est vide.
async function run() {
  for (const name of [ROLES.CLIENT, ROLES.ADMIN]) {
    const existing = await prisma.roles.findFirst({ where: { name }, select: { id: true } })
    if (existing) {
      console.log(`[seed:roles] Role "${name}" déjà présent (id=${existing.id}).`)
      continue
    }
    try {
      const created = await prisma.roles.create({ data: { name } })
      console.log(`[seed:roles] Role "${name}" créé (id=${created.id}).`)
    } catch (err) {
      if (err.code !== 'P2002') throw err
      console.log(`[seed:roles] Role "${name}" créé concurremment.`)
    }
  }
  return 0
}

run()
  .then(async (code) => {
    await closeDb()
    process.exit(code)
  })
  .catch(async (err) => {
    console.error('[seed:roles] Erreur inattendue :', err)
    try {
      await closeDb()
    } catch {
      // client déjà fermé
    }
    process.exit(1)
  })
