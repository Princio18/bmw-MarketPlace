const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')
const { prisma } = require('../db')
const { sendMail } = require('./mailer')
const accessoryService = require('./accessoryService')

const RECEIPT_TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'receipt-email.html')

function groupToSpaces(str) {
  return String(str).replace(/[\u202f\u00a0,]/g, ' ')
}

// Séparateur de milliers en espace fine (usage suisse) : le même dans le PDF,
// les lignes de l'email et le résumé, pour éviter « £114305 » à côté de
// « £114 305.00 » sur le même document.
function formatGbp(amount) {
  return groupToSpaces(
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(Number(amount)),
  )
}

// Même chose sans le symbole : pour les emplacements du template qui écrivent
// déjà « £{{amount}} ».
function formatGbpAmount(amount) {
  return formatGbp(amount).replace(/^\u00a3/, '')
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// Bloc « lignes du règlement » injecté dans l'email. Les libellés viennent de
// la base (saisis par un admin) : ils sont échappés avant injection HTML.
function renderLinesHtml(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return ''
  const rows = lines
    .map(
      (line) => `        <tr>
          <td style="padding: 6px 0; font-size: 14px; line-height: 20px; color: #1a1a1a;">${escapeHtml(line.label)}</td>
          <td align="right" style="padding: 6px 0; font-size: 14px; line-height: 20px; color: #1a1a1a; white-space: nowrap;">${escapeHtml(formatGbp(line.amount))}</td>
        </tr>`,
    )
    .join('\n')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 0 20px 0;">
${rows}
      </table>`
}

function renderReceiptEmail({ modelName, amount, lines = [] }) {
  const template = fs.readFileSync(RECEIPT_TEMPLATE_PATH, 'utf8')
  return template
    .replaceAll('{{lines}}', renderLinesHtml(lines))
    .replaceAll('{{modelName}}', modelName)
    .replaceAll('{{amount}}', formatGbpAmount(amount))
}

// `lines` = [{ label, amount }] : la ligne véhicule + une ligne par accessoire.
// Sans `lines`, on retombe sur la ligne véhicule unique (compatibilité).
async function generateReceiptPdf(order, user, vehicle, lines = []) {
  const items =
    Array.isArray(lines) && lines.length > 0
      ? lines
      : [
          {
            label: `BMW ${vehicle?.modelName ?? ''} — ${vehicle?.variantLabel ?? ''}`.trim(),
            amount: order.amount,
          },
        ]

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const headingColor = '#1a1a1a'
    const mutedColor = '#777777'
    const ruleColor = '#d9d9d9'
    const LEFT = 48
    const RIGHT = 547
    const AMOUNT_LEFT = 400
    const AMOUNT_WIDTH = 147

    doc
      .fontSize(24)
      .fillColor('#0066b1')
      .text('BMW Marketplace', { continued: false })
      .moveDown(0.1)
    doc
      .fontSize(13)
      .fillColor(headingColor)
      .text('Payment Receipt')
      .moveDown(1.4)

    doc
      .fontSize(9)
      .fillColor(mutedColor)
      .text('Order number', { continued: true })
      .fillColor(headingColor)
      .fontSize(10)
      .text(`  #${order.id.slice(0, 8)}`, { continued: false })
      .moveDown(0.4)
    doc
      .fontSize(9)
      .fillColor(mutedColor)
      .text('Date', { continued: true })
      .fillColor(headingColor)
      .fontSize(10)
      .text(`  ${new Date(order.created_at).toLocaleDateString('en-GB')}`, { continued: false })
      .moveDown(1.4)

    doc
      .fontSize(9)
      .fillColor(mutedColor)
      .text('Billed to', { continued: true })
      .fillColor(headingColor)
      .fontSize(10)
      .text(`  ${user?.email ?? ''}`, { continued: false })
      .moveDown(1.6)

    // --- Tableau des lignes -------------------------------------------------
    // Positionnement piloté par `y` plutôt que par des valeurs figées : le
    // reçu reste correct quel que soit le nombre d'accessoires achetés.
    doc.fontSize(10).fillColor(headingColor)
    let y = doc.y
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor(ruleColor).lineWidth(1).stroke()
    y += 12
    doc
      .fontSize(10)
      .fillColor(mutedColor)
      .text('Item', LEFT, y, { width: AMOUNT_LEFT - LEFT - 12 })
      .text('Amount', AMOUNT_LEFT, y, { width: AMOUNT_WIDTH, align: 'right' })

    y += 20
    doc.fontSize(11).fillColor(headingColor)
    for (const line of items) {
      const labelWidth = AMOUNT_LEFT - LEFT - 12
      const height = doc.heightOfString(String(line.label), { width: labelWidth })
      doc.text(String(line.label), LEFT, y, { width: labelWidth })
      doc.text(formatGbp(line.amount), AMOUNT_LEFT, y, {
        width: AMOUNT_WIDTH,
        align: 'right',
      })
      y += Math.max(height, 12) + 8
    }

    // --- Total --------------------------------------------------------------
    y += 8
    doc
      .moveTo(AMOUNT_LEFT, y)
      .lineTo(RIGHT, y)
      .strokeColor(ruleColor)
      .lineWidth(1)
      .stroke()
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(headingColor)
      .text('Total paid:', LEFT, y + 10)
      .text(`${formatGbp(order.amount)} GBP`, AMOUNT_LEFT, y + 10, {
        width: AMOUNT_WIDTH,
        align: 'right',
      })

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(mutedColor)
      .text(
        'This receipt confirms a completed payment via Stripe. For questions, contact our customer support.',
        LEFT,
        720,
        { width: 499 },
      )

    doc.end()
  })
}

// Construit les lignes de règlement d'une commande : véhicule + les accessoires
// choisis dans le panier. Les prix sont RELUS EN BASE à chaque envoi, ce qui
// couvre aussi le renvoi manuel depuis l'admin (POST /admin/orders/:id/resend-receipt).
async function buildOrderLines(order) {
  const { items } = await accessoryService.resolveAccessories(
    order.configurationData?.accessoryIds,
  )
  return [
    {
      label: `BMW ${order.modelName} — ${order.variantLabel}`,
      amount: Number(order.basePrice),
    },
    ...items.map((item) => ({ label: item.name, amount: Number(item.price) })),
  ]
}

async function sendOrderReceipt(orderId) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       o.*,
       u.email,
       v.model_name AS "modelName",
       v.variant_label AS "variantLabel",
       v.base_price::float8 AS "basePrice",
       c.configuration_data AS "configurationData"
     FROM orders o
     JOIN users u ON u.id = o.user_id
     JOIN vehicles v ON v.id = o.vehicle_id
     LEFT JOIN carts c ON c.id = o.cart_id
     WHERE o.id = $1`,
    orderId,
  )
  const order = rows[0]
  if (!order) {
    throw new Error(`Order ${orderId} not found`)
  }

  const lines = await buildOrderLines(order)
  const pdfBuffer = await generateReceiptPdf(
    order,
    { email: order.email },
    { modelName: order.modelName, variantLabel: order.variantLabel },
    lines,
  )
  const amount = groupToSpaces(Number(order.amount).toLocaleString('en-GB'))

  await sendMail({
    to: order.email,
    subject: `Your BMW Marketplace Receipt — Order #${order.id.slice(0, 8)}`,
    html: renderReceiptEmail({
      modelName: order.modelName,
      amount,
      lines,
    }),
    attachments: [
      {
        filename: `receipt-${order.id.slice(0, 8)}.pdf`,
        content: pdfBuffer,
      },
    ],
  })

  await prisma.orders.updateMany({
    where: { id: orderId },
    data: { receipt_sent_at: new Date() },
  })
}

module.exports = { generateReceiptPdf, renderReceiptEmail, sendOrderReceipt }
