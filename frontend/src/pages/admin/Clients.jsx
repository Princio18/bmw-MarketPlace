import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Package, ShoppingBag, Heart } from 'lucide-react'
import api from '@/services/api'
import { getAuthToken } from '@/lib/authToken'
import { formatPrice } from '@/lib/price'
import { useAdminSearch } from '@/context/useAdminSearch'

const authHeader = { headers: { Authorization: `Bearer ${getAuthToken()}` } }

// Rafraîchissement du panneau client : assez lent pour ne pas charger la base,
// assez vif pour qu'un commercial voie la configuration du client changer en
// direct pendant qu'il discute avec lui.
const DETAIL_POLL_MS = 15000

// Correspondance entre les clés stockées dans configuration_data et les listes
// de specs du véhicule, dans l'ordre d'affichage.
const CONFIG_ROWS = [
  { key: 'modelId', list: 'models', label: 'configModel' },
  { key: 'engineId', list: 'engines', label: 'configEngine' },
  { key: 'exteriorColourId', list: 'exteriorColours', label: 'configExterior' },
  { key: 'alloyWheelId', list: 'alloyWheels', label: 'configWheels' },
]

const toList = (value) => (Array.isArray(value) ? value : [])

// La colonne `configuration_data` peut être renvoyée en JSONB (objet) ou en
// texte selon la forme du jsonb driver : on accepte les deux.
function asObject(value) {
  if (value && typeof value === 'object') return value
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

// Catalogue des accessoires chargé une seule fois par session admin : il est
// partagé par tous les clients consultés et n'a aucune raison d'être rechargé
// à chaque ouverture de panneau.
let accessoriesPromise = null
function loadAccessories() {
  if (!accessoriesPromise) {
    accessoriesPromise = api
      .get('/accessories')
      .then(({ data }) => toList(data?.accessories))
      .catch(() => [])
  }
  return accessoriesPromise
}

function StatusPill({ status }) {
  const { t } = useTranslation('admin')
  const styles = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    paid: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    expired: 'bg-zinc-200 text-zinc-700 dark:bg-gray-700 dark:text-gray-300',
    refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  }
  return (
    <span
      className={`inline-block rounded-sm px-2 py-0.5 text-xs font-semibold ${
        styles[status] || styles.pending
      }`}
    >
      {t(`orders.payment${status.charAt(0).toUpperCase()}${status.slice(1)}`)}
    </span>
  )
}

/**
 * Traduit les identifiants stockés dans le panier en libellés lisibles en
 * s'appuyant sur les specs du véhicule. Un identifiant inconnu (option
 * supprimée du catalogue) reste affiché tel quel plutôt que masqué : c'est
 * précisément l'information qu'un vendeur doit voir.
 */
function ConfigurationSummary({ cart, accessories }) {
  const { t } = useTranslation('admin')

  // Les deux blobs arrivent du serveur : on les convertit une seule fois pour
  // que les memos ci-dessous aient une dépendance stable.
  const specs = useMemo(() => asObject(cart.specs), [cart.specs])
  const configuration = useMemo(
    () => asObject(cart.configurationData),
    [cart.configurationData],
  )

  const rows = useMemo(
    () =>
      CONFIG_ROWS.map(({ key, list, label }) => {
        const id = configuration[key]
        if (!id) return null
        const option = toList(specs[list]).find((item) => item?.id === id)
        return {
          key,
          label: t(`clients.${label}`),
          value: option?.name || id,
          hint: option?.code || null,
        }
      }).filter(Boolean),
    [configuration, specs, t],
  )

  const selectedAccessories = useMemo(() => {
    // Dédupliqué : un identifiant en double ferait collision de clé React et
    // gonflerait le total alors que le serveur ne le retient qu'une fois.
    const ids = [...new Set(toList(configuration.accessoryIds))]
    return ids.map((id) => {
      const accessory = accessories.find((item) => item?.id === id)
      return {
        id,
        name: accessory?.name || id,
        // Un accessoire absent du catalogue public est archivé ou expiré : le
        // serveur refuserait la commande, on l'exclut donc de l'estimation.
        price: accessory && accessory.inStock ? Number(accessory.price) || 0 : null,
      }
    })
  }, [configuration.accessoryIds, accessories])

  if (rows.length === 0 && selectedAccessories.length === 0) {
    return (
      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {t('clients.configNone')}
      </p>
    )
  }

  // ESTIMATION : le prix affiché au client peut différer du montant facturé,
  // qui est toujours recalculé par le serveur à la création du paiement.
  const model = toList(specs.models).find(
    (item) => item?.id === configuration.modelId,
  )
  const base = model?.priceFrom ?? cart.basePrice ?? 0
  const accessoriesTotal = selectedAccessories.reduce(
    (sum, item) => sum + (item.price ?? 0),
    0,
  )

  return (
    <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-gray-700">
      <dl className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.key} className="flex items-baseline justify-between gap-3 text-xs">
            <dt className="shrink-0 text-gray-500 dark:text-gray-400">{row.label}</dt>
            <dd className="truncate text-right font-medium text-gray-900 dark:text-white">
              {row.value}
              {row.hint && (
                <span className="ml-1 font-normal text-gray-400">{row.hint}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>

      {selectedAccessories.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {t('clients.configAccessories')}
          </p>
          <ul className="mt-1.5 space-y-1">
            {selectedAccessories.map((item) => (
              <li
                key={item.id}
                className="flex items-baseline justify-between gap-3 text-xs"
              >
                <span className="truncate text-gray-600 dark:text-gray-300">
                  {item.name}
                </span>
                <span className="shrink-0 text-gray-500 dark:text-gray-400">
                  {item.price == null
                    ? t('clients.configUnavailable')
                    : formatPrice(item.price, 'en-GB')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-zinc-200 pt-2 text-xs dark:border-gray-700">
        <span className="font-semibold text-gray-700 dark:text-gray-300">
          {t('clients.estimatedTotal')}
        </span>
        <span className="font-semibold text-gray-900 dark:text-white">
          {formatPrice(base + accessoriesTotal, 'en-GB')}
        </span>
      </div>
    </div>
  )
}

function ClientDetail({ clientData, accessories, onClose }) {
  const { t, i18n } = useTranslation('admin')
  const lang = i18n.resolvedLanguage || i18n.language

  if (!clientData) return null
  const { client, orders, cart, favorites } = clientData

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(lang) : '—'

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto border-l border-zinc-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('clients.detailTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded p-1.5 text-gray-500 hover:bg-zinc-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-1 truncate text-sm font-medium text-bmw-blue">{client.email}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Heart size={13} />
          {t('clients.registeredAt')} : {formatDate(client.createdAt)}
        </p>

        <section className="mt-6">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Package size={15} />
            {t('clients.orders')}
          </h3>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('clients.noOrders')}</p>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="rounded border border-zinc-200 p-3 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {order.modelName}
                    </p>
                    <StatusPill status={order.status} />
                  </div>
                  {order.variantLabel && (
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {order.variantLabel}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>
                      {t('clients.amount')} : {formatPrice(order.amount, 'en-GB')}
                    </span>
                    <span>
                      {order.hasReview ? t('clients.reviewed') : t('clients.notReviewed')}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{formatDate(order.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <ShoppingBag size={15} />
            {t('clients.cart')}
          </h3>
          {!cart ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('clients.noCart')}</p>
          ) : (
            <div className="rounded border border-zinc-200 p-3 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{cart.modelName}</p>
              <div className="mt-1.5 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>{formatPrice(cart.basePrice, 'en-GB')}</span>
                <span>{formatDate(cart.updatedAt)}</span>
              </div>
              <ConfigurationSummary cart={cart} accessories={accessories} />
            </div>
          )}
        </section>

        <section className="mt-6">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Heart size={15} />
            {t('clients.favorites')}
          </h3>
          {favorites.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('clients.noFavorites')}</p>
          ) : (
            <ul className="space-y-2">
              {favorites.map((fav) => (
                <li
                  key={fav.id}
                  className="flex items-center justify-between gap-2 rounded border border-zinc-200 p-2.5 text-sm dark:border-gray-700"
                >
                  <span className="truncate font-medium text-gray-900 dark:text-white">
                    {fav.modelName}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                    {formatPrice(fav.basePrice, 'en-GB')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </>
  )
}

function Clients() {
  const { t, i18n } = useTranslation('admin')
  const lang = i18n.resolvedLanguage || i18n.language
  const { query } = useAdminSearch()

  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [accessories, setAccessories] = useState([])

  useEffect(() => {
    api
      .get('/admin/clients', authHeader)
      .then(({ data }) => setClients(data.clients || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  // Le catalogue est utile dès qu'un panier contient des accessoires.
  useEffect(() => {
    let cancelled = false
    loadAccessories().then((list) => {
      if (!cancelled) setAccessories(list)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Chargement du détail + rafraîchissement périodique tant qu'un client est
  // sélectionné. L'intervalle est détruit dès que le panneau se ferme
  // (`selected` repasse à null) : aucune requête ne subsiste en arrière-plan.
  useEffect(() => {
    if (!selected) return undefined
    let cancelled = false

    const load = () => {
      api
        .get(`/admin/clients/${selected}`, authHeader)
        .then(({ data }) => {
          if (!cancelled) setDetail(data)
        })
        .catch(() => {
          if (!cancelled) setDetail(null)
        })
    }

    load()
    const interval = setInterval(load, DETAIL_POLL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [selected])

  const handleSelect = useCallback((id) => {
    setDetail(null)
    setSelected(id)
  }, [])

  const filtered = clients.filter((client) =>
    client.email.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(lang) : '—'

  return (
    <div>
      <h1 className="font-manrope text-2xl font-bold text-gray-900 dark:text-white">
        {t('clients.title')}
      </h1>

      <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {loading ? (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('clients.loading')}
          </p>
        ) : error ? (
          <p className="py-16 text-center text-sm text-red-600 dark:text-red-400">
            {t('clients.error')}
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('clients.noClients')}
          </p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3 font-medium">{t('clients.email')}</th>
                <th className="px-5 py-3 font-medium">{t('clients.registeredAt')}</th>
                <th className="px-5 py-3 font-medium">{t('clients.nbOrders')}</th>
                <th className="px-5 py-3 font-medium">{t('clients.totalSpent')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-gray-800">
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  onClick={() => handleSelect(client.id)}
                  className="cursor-pointer transition hover:bg-zinc-50 dark:hover:bg-gray-800"
                >
                  <td className="px-5 py-4 font-medium text-bmw-blue">{client.email}</td>
                  <td className="px-5 py-4 text-gray-700 dark:text-gray-200">
                    {formatDate(client.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-gray-700 dark:text-gray-200">
                    {Number(client.orderCount).toLocaleString(lang)}
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">
                    {formatPrice(client.totalSpent, 'en-GB')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && detail && (
        <ClientDetail
          clientData={detail}
          accessories={accessories}
          onClose={() => {
            setSelected(null)
            setDetail(null)
          }}
        />
      )}
    </div>
  )
}

export default Clients