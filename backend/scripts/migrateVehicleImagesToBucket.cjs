/**
 * Migre les images véhicules BYTEA vers le Neon Object Storage.
 *
 * Sûr par construction :
 *  - n'écrit QUE ce qui est vérifié octet pour octet ;
 *  - si le SHA-256 téléchargé ne correspond pas au blob source, la ligne n'est
 *    PAS marquée migrée et le BYTEA est conservé ;
 *  - image_data n'est vidé qu'après relecture réussie depuis le bucket, ce qui
 *    rend l'opération réversible (relancer avec --keep-bytea pour dupliquer).
 *
 * Prérequis : AWS_ENDPOINT_URL_S3, AWS_REGION, AWS_ACCESS_KEY_ID,
 * AWS_SECRET_ACCESS_KEY et S3_BUCKET_NAME dans l'environnement.
 *
 * Usage :
 *   node scripts/migrateVehicleImagesToBucket.cjs            # migration
 *   node scripts/migrateVehicleImagesToBucket.cjs --dry-run  # rapport seul
 *   node scripts/migrateVehicleImagesToBucket.cjs --keep-bytea
 */
const crypto = require('crypto')
const path = require('path')

require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const { isObjectStorageConfigured, putObject, getObjectAsBuffer } = require('../src/services/objectStorage')
const { toBuffer } = require('../src/utils/bytes')

const DRY_RUN = process.argv.includes('--dry-run')
const KEEP_BYTEA = process.argv.includes('--keep-bytea')

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

async function main() {
  if (!isObjectStorageConfigured()) {
    console.error(
      'Configuration stockage absente. Variables requises :\n' +
        '  AWS_ENDPOINT_URL_S3, AWS_REGION, AWS_ACCESS_KEY_ID,\n' +
        '  AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME',
    )
    process.exit(1)
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  const prisma = new PrismaClient({ adapter })

  try {
    // $queryRawUnsafe (et non pgSafe) : le BYTEA doit rester un Buffer, sinon
    // JSON.stringify le transforme en { type: 'Buffer', data: [...] }.
    const rows = await prisma.$queryRawUnsafe(`
      SELECT id, model_name, variant_label, image_data, image_mime_type, image_key
      FROM vehicles
      WHERE deleted_at IS NULL
      ORDER BY model_name
    `)

    const withImage = rows.filter((r) => r.image_data !== null)
    console.log(`véhicules : ${rows.length} | avec image : ${withImage.length}`)
    console.log(
      `mode : ${DRY_RUN ? 'DRY-RUN (aucune écriture)' : KEEP_BYTEA ? 'migration, BYTEA conservé' : 'migration, BYTEA vidé'}`,
    )
    console.log('')

    let migrated = 0
    let skipped = 0
    let failed = 0

    for (const row of withImage) {
      const label = `${row.model_name} ${row.variant_label || ''}`.trim()
      const source = toBuffer(row.image_data)
      if (!source) {
        console.log(`  [IGNORÉ ] ${label} — BYTEA illisible`)
        skipped++
        continue
      }

      const expectedHash = sha256(source)
      const mimetype = row.image_mime_type || 'image/png'

      if (DRY_RUN) {
        console.log(`  [DRY    ] ${label} — ${source.length} o, sha=${expectedHash.slice(0, 12)}`)
        continue
      }

      if (row.image_key) {
        console.log(`  [DÉJÀ   ] ${label} — image_key déjà positionnée`)
        skipped++
        continue
      }

      try {
        const key = await putObject({ scope: 'vehicles', id: row.id, body: source, mimetype })

        const { buffer } = await getObjectAsBuffer(key)
        if (sha256(buffer) !== expectedHash) {
          console.log(`  [ÉCHEC  ] ${label} — SHA-256 différent après écriture, ligne non marquée`)
          failed++
          continue
        }

        await prisma.vehicles.update({
          where: { id: row.id },
          data: {
            image_key: key,
            image_updated_at: new Date(),
            ...(KEEP_BYTEA ? {} : { image_data: null }),
          },
        })
        migrated++
        console.log(`  [OK     ] ${label} — ${source.length} o -> ${key}`)
      } catch (err) {
        failed++
        console.log(`  [ERREUR ] ${label} — ${err.message}`)
      }
    }

    console.log('')
    console.log(`migrés : ${migrated} | ignorés : ${skipped} | échecs : ${failed}`)
    if (!DRY_RUN && failed === 0) {
      console.log('Toutes les images vérifiées par SHA-256 avant vidage du BYTEA.')
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('ERREUR FATALE:', err.message)
  process.exit(1)
})