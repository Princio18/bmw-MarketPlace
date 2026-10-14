const { prisma } = require('../db')

// Journalise un message lié à une demande de configuration. `sentBy` NULL
// désigne un message automatique. delivery_status vaut 'sent' ou 'failed'.
async function logRequestMessage({
  requestId,
  sentBy = null,
  subject,
  body,
  deliveryStatus = 'sent',
}) {
  return prisma.request_messages.create({
    data: {
      request_id: requestId,
      sent_by: sentBy,
      subject,
      body,
      delivery_status: deliveryStatus,
    },
  })
}

// Envoie un email puis journalise son issue. En cas d'échec d'envoi, une ligne
// 'failed' est CONSERVÉE (rien n'est perdu). Ne propage jamais d'exception :
// conçu pour être appelé depuis background() sans faire échouer la requête.
async function sendAndLogRequestMessage({
  requestId,
  sentBy = null,
  subject,
  body,
  send,
}) {
  let deliveryStatus = 'sent'
  try {
    await send()
  } catch (err) {
    deliveryStatus = 'failed'
    console.error(`[request-messages] envoi échoué (demande ${requestId}) :`, err.message)
  }

  try {
    await logRequestMessage({ requestId, sentBy, subject, body, deliveryStatus })
  } catch (err) {
    console.error(
      `[request-messages] journalisation échouée (demande ${requestId}) :`,
      err.message,
    )
  }
}

module.exports = { logRequestMessage, sendAndLogRequestMessage }
