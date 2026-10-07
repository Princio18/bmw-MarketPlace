// Import one-shot des visuels d'accessoires fournis en local.
//
// Chaque fichier du dossier source est apparié à un accessoire par NOM
// (normalisé), redimensionné/converti en WebP, puis téléversé dans le bucket
// via le pipeline standard (`buildImageFields`) : la ligne `accessories` ne
// reçoit qu'une clé d'objet, jamais d'URL, exactement comme les autres images.
//
// Usage :
//   node scripts/importAccessoryImages.cjs
//   node scripts/importAccessoryImages.cjs --dir=chemin/vers/images
//
// Le dossier source doit être HORS de frontend/public : tout ce qui s'y trouve
// est copié dans le build Vite et donc publié sur le CDN.

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { prisma } = require('../src/db')
const { buildImageFields } = require('../src/utils/imagePersistence')

const DEFAULT_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  'frontend',
  'public',
  'images',
  'accessoires',
)
const MAX_DIMENSION = 1200
const WEBP_QUALITY = 80
const IMAGE_EXT = /\.(png|jpe?g|webp|jfif)$/i

function normalize(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function parseDir(argv) {
  const arg = argv.find((a) => a.startsWith('--dir='))
  return arg ? path.resolve(arg.slice('--dir='.length)) : DEFAULT_DIR
}

function kb(bytes) {
  return `${(bytes / 1024).toFixed(0)} Ko`
}

async function main() {
  const dir = parseDir(process.argv.slice(2))
  if (!fs.existsSync(dir)) {
    console.error(`Dossier introuvable : ${dir}`)
    process.exit(1)
  }

  const accessories = await prisma.accessories.findMany({
    where: { deleted_at: null },
    select: { id: true, name: true },
  })
  const byName = new Map(accessories.map((a) => [normalize(a.name), a]))

  const files = fs.readdirSync(dir).filter((f) => IMAGE_EXT.test(f))
  if (files.length === 0) {
    console.error(`Aucune image dans ${dir}`)
    process.exit(1)
  }

  const unmatched = []
  for (const file of files) {
    const full = path.join(dir, file)
    const base = file.replace(/\.[^.]+$/, '')
    const accessory = byName.get(normalize(base))
    if (!accessory) {
      unmatched.push(file)
      continue
    }

    const originalSize = fs.statSync(full).size
    const buffer = await sharp(full)
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer()

    const fields = await buildImageFields({
      file: { buffer, mimetype: 'image/webp' },
      scope: 'accessories',
      id: accessory.id,
    })
    await prisma.accessories.update({ where: { id: accessory.id }, data: fields })

    console.log(
      `${accessory.name} <- ${file} (${kb(originalSize)} -> ${kb(buffer.length)}, ${
        fields.image_key || 'BYTEA'
      })`,
    )
  }

  if (unmatched.length > 0) {
    console.warn(`Fichiers non appariés (ignorés) : ${unmatched.join(', ')}`)
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})