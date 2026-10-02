const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3')

/**
 * Stockage objet S3-compatible (Neon Object Storage).
 *
 * Contrat : on ne stocke JAMAIS d'URL en base, uniquement la clé d'objet
 * relative (`vehicles/<uuid>.png`). Les routes HTTP continuent d'exposer
 * `/api/.../<id>/image`, donc aucun chemin absolu ne circule côté client et le
 * frontend reste indépendant du mode de stockage.
 *
 * Le bucket est optionnel : tant que les variables AWS_* manquent,
 * isObjectStorageConfigured() vaut false et les appelants basculent sur le
 * repli BYTEA. Le serveur démarre donc normalement sans configuration storage.
 */

let client = null

function isObjectStorageConfigured() {
  return Boolean(
    process.env.AWS_ENDPOINT_URL_S3 &&
      process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.S3_BUCKET_NAME,
  )
}

function getClient() {
  if (!client) {
    if (!isObjectStorageConfigured()) {
      throw new Error(
        'Stockage objet non configuré : AWS_ENDPOINT_URL_S3, AWS_REGION, ' +
          'AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY et S3_BUCKET_NAME requis.',
      )
    }
    client = new S3Client({
      region: process.env.AWS_REGION,
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
      // Neon n'accepte que l'adressage par chemin : le style
      // bucket.host/key (virtual-hosted) n'est pas supporté.
      forcePathStyle: true,
      // Sans ça, les versions récentes du SDK ajoutent un checksum calculé sur
      // un corps vide pour les URL pré-signées, ce qui fait rejeter tout upload
      // contenant un vrai contenu.
      requestChecksumCalculation: 'WHEN_REQUIRED',
    })
  }
  return client
}

function getBucket() {
  return process.env.S3_BUCKET_NAME
}

const MIME_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
}

/**
 * Construit une clé relative et déterministe : `accessories/<uuid>.png`.
 * Déterministe = réécrire l'image d'un même accessoire écrase l'objet au lieu
 * d'en laisser un orphelin à chaque modification.
 */
function buildObjectKey(scope, id, mimetype) {
  const ext = MIME_EXTENSIONS[mimetype] || 'bin'
  return `${scope}/${id}.${ext}`
}

async function putObject({ scope, id, body, mimetype }) {
  const key = buildObjectKey(scope, id, mimetype)
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: mimetype,
    }),
  )
  return key
}

/**
 * Retourne un Buffer. On lit le corps en mémoire : les images de ce projet
 * sont plafonnées à 2 Mo par le middleware d'upload, donc pas de streaming
 * nécessaire ici.
 */
async function getObjectAsBuffer(key) {
  const res = await getClient().send(
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
  )
  const chunks = []
  for await (const chunk of res.Body) chunks.push(chunk)
  return { buffer: Buffer.concat(chunks), contentType: res.ContentType }
}

async function deleteObject(key) {
  await getClient().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }))
}

module.exports = {
  isObjectStorageConfigured,
  buildObjectKey,
  putObject,
  getObjectAsBuffer,
  deleteObject,
}