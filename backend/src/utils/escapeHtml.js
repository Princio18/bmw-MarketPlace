// Échappe une valeur destinée à être insérée dans du HTML. Utilisé partout où
// du texte saisi (admin, client) finit dans un template email : sans cela, une
// balise injectée dans le corps d'un message s'exécuterait dans la boîte mail.
function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

module.exports = { escapeHtml }
