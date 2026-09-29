const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')
const { prisma } = require('../db')
const { sendMail } = require('./mailer')

const RECEIPT_TEMPLATE_PATH = path.join(__dirname, '..', 'templates', 'receipt-email.html')

function groupToSpaces(str) {
  return String(str).replace(/[\u202f\u00a0,]/g, ' ')
}

function formatGbp(amount) {
  return groupToSpaces(
    new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(Number(amount)),
  )
}

function renderReceiptEmail({ modelName, amount }) {
  const template = fs.readFileSync(RECEIPT_TEMPLATE_PATH, 'utf8')
  return template.replaceAll('{{modelName}}', modelName).replaceAll('{{amount}}', amount)
}

async function generateReceiptPdf(order, user, vehicle) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const headingColor = '#1a1a1a'
    const mutedColor = '#777777'
    const ruleColor = '#d9d9d9'

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
      .text(`  ${user.email}`, { continued: false })
      .moveDown(1.6)

    const tableTop = doc.y
    doc.moveTo(48, tableTop).lineTo(547, tableTop).strokeColor(ruleColor).lineWidth(1).stroke()
    doc
      .fontSize(10)
      .fillColor(mutedColor)
      .text('Vehicle', 48, tableTop + 12)
      .text('Amount', 400, tableTop + 12, { width: 147, align: 'right' })
    doc
      .fontSize(11)
      .fillColor(headingColor)
      .text(`BMW ${vehicle.modelName} — ${vehicle.variantLabel}`, 48, tableTop + 32, { width: 340 })
      .text(formatGbp(order.amount), 400, tableTop + 32, { width: 147, align: 'right' })

    const totalTop = tableTop + 56
    doc.moveTo(400, totalTop).lineTo(547, totalTop).strokeColor(ruleColor).lineWidth(1).stroke()
    doc
      .font( 'Helvetica-Bold')
      .fontSize(12)
      .text('Total paid:', 48, totalTop + 10)
      .text(`${formatGbp(order.amount)} GBP`, 400, totalTop + 10, { width: 147, align: 'right' })

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(mutedColor)
      .text(
        'This receipt confirms a completed payment via Stripe. For questions, contact our customer support.',
        48,
        720,
        { width: 499 },
      )

    doc.end()
  })
}

async function sendOrderReceipt(orderId) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       o.*,
       u.email,
       v.model_name AS "modelName",
       v.variant_label AS "variantLabel"
     FROM orders o
     JOIN users u ON u.id = o.user_id
     JOIN vehicles v ON v.id = o.vehicle_id
     WHERE o.id = $1`,
    orderId,
  )
  const order = rows[0]
  if (!order) {
    throw new Error(`Order ${orderId} not found`)
  }

  const pdfBuffer = await generateReceiptPdf(order, order, order)
  const amount = groupToSpaces(Number(order.amount).toLocaleString('en-GB'))

  await sendMail({
    to: order.email,
    subject: `Your BMW Marketplace Receipt — Order #${order.id.slice(0, 8)}`,
    html: renderReceiptEmail({
      modelName: order.modelName,
      amount,
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