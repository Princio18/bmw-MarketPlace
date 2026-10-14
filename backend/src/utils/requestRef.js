// Référence lisible et stable d'une demande, dérivée de son UUID. Partagée par
// toutes les couches (client, admin) pour garantir un identifiant unique.
function requestRef(id) {
  return `REQ-${String(id).slice(0, 8).toUpperCase()}`
}

module.exports = { requestRef }
