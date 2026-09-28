const { Router } = require('express')
const PDFDocument = require('pdfkit')
const { query } = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')
const { checkPermission } = require('../middleware/checkPermission')
const { ROLES } = require('../roles')

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function csvField(value) {
  if (value === undefined || value === null) return ''
  const str = String(value)
  if (/[",\r\n]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`
  }
  return str
}

function toCsv(headers, rows) {
  const lines = [headers.map(csvField).join(',')]
  for (const row of rows) {
    lines.push(row.map(csvField).join(','))
  }
  return '\uFEFF' + lines.join('\r\n')
}

function sendCsv(res, csv, filename) {
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${filename}"`,
  })
  res.send(csv)
}

async function exportOrdersCsv(req, res) {
  const { from, to } = req.query
  if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) {
    return res.status(400).json({ error: 'from/to au format YYYY-MM-DD attendu.' })
  }

  const conditions = []
  const values = []
  if (from) {
    values.push(from)
    conditions.push(`o.created_at >= $${values.length}::date`)
  }
  if (to) {
    values.push(to)
    conditions.push(`o.created_at < ($${values.length}::date + interval '1 day')`)
  }

  const { rows } = await query(
    `SELECT
       o.id,
       o.created_at AS "date",
       u.email AS "client",
       v.model_name AS "vehicle",
       o.amount::float8 AS "amount",
       o.status AS "paymentStatus",
       o.processing_status AS "processingStatus"
     FROM orders o
     JOIN users u ON u.id = o.user_id
     JOIN vehicles v ON v.id = o.vehicle_id
     ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
     ORDER BY o.created_at DESC`,
    values,
  )

  const csv = toCsv(
    ['ID', 'Date', 'Client', 'Véhicule', 'Montant', 'Statut paiement', 'Statut traitement'],
    rows.map((r) => [
      r.id,
      r.date,
      r.client,
      r.vehicle,
      r.amount,
      r.paymentStatus,
      r.processingStatus,
    ]),
  )

  sendCsv(res, csv, `orders-${from || 'all'}-${to || 'now'}.csv`)
}

async function exportVehiclesCsv(req, res) {
  const { rows } = await query(
    `SELECT
       v.id,
       v.model_name AS "modelName",
       v.variant_label AS "variantLabel",
       v.category,
       v.series,
       v.drivetrain,
       v.base_price::float8 AS "basePrice",
       COALESCE(a.email, '') AS "addedBy",
       v.created_at AS "createdAt",
       v.deleted_at AS "deletedAt"
     FROM vehicles v
     LEFT JOIN users a ON a.id = v.created_by
     ORDER BY v.created_at DESC`,
  )

  const csv = toCsv(
    ['ID', 'Modèle', 'Variante', 'Catégorie', 'Série', 'Drivetrain', 'Prix', 'Ajouté par', 'Statut', 'Créé le'],
    rows.map((r) => [
      r.id,
      r.modelName,
      r.variantLabel,
      r.category,
      r.series,
      r.drivetrain,
      r.basePrice,
      r.addedBy,
      r.deletedAt ? 'Retiré' : 'Disponible',
      r.createdAt,
    ]),
  )

  sendCsv(res, csv, 'inventory-vehicles.csv')
}

async function exportRevenuePdf(req, res) {
  const { rows } = await query(
    `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS "month",
            COALESCE(SUM(amount), 0)::float8 AS "revenue"
       FROM orders
      WHERE status = 'paid' AND created_at >= date_trunc('month', now() - interval '11 months')
      GROUP BY 1
      ORDER BY 1`,
  )

  const pdfBuffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(20).fillColor('#0066b1').text('BMW Marketplace', { continued: false }).moveDown(0.1)
    doc.fontSize(13).fillColor('#1a1a1a').text('Revenue report — last 12 months').moveDown(1.2)

    const tableTop = doc.y
    doc.moveTo(48, tableTop).lineTo(547, tableTop).strokeColor('#d9d9d9').lineWidth(1).stroke()
    doc
      .fontSize(10)
      .fillColor('#777777')
      .text('Month', 48, tableTop + 12)
      .text('Revenue (GBP)', 400, tableTop + 12, { width: 147, align: 'right' })

    let y = tableTop + 34
    doc.fontSize(11).fillColor('#1a1a1a')
    for (const row of rows) {
      doc.text(row.month, 48, y).text(row.revenue.toLocaleString('en-GB'), 400, y, {
        width: 147,
        align: 'right',
      })
      y += 22
    }

    doc
      .fontSize(9)
      .fillColor('#777777')
      .text('Generated automatically by BMW AutoSell.', 48, 720, { width: 499 })
    doc.end()
  })

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename="revenue-by-month.pdf"',
  })
  res.send(pdfBuffer)
}

const router = Router()

router.use(authenticate)
router.use(requireRole(ROLES.ADMIN))

router.get('/orders', checkPermission('can_view_reports'), exportOrdersCsv)
router.get('/vehicles', checkPermission('can_view_reports'), exportVehiclesCsv)
router.get('/revenue', checkPermission('can_view_reports'), exportRevenuePdf)

module.exports = router