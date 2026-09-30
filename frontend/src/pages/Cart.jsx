import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import ScrollToTopButton from '../components/layout/ScrollToTopButton'
import DrivetrainIcon from '../components/all-models/DrivetrainIcon'
import api from '../services/api'
import { getAuthToken } from '../lib/authToken'
import { formatPrice } from '../lib/price'

function Cart() {
  const { t } = useTranslation()
  const [cart, setCart] = useState(null)
  const [accessories, setAccessories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  useEffect(() => {
    api
      .get('/cart', { headers: { Authorization: `Bearer ${getAuthToken()}` } })
      .then(({ data }) => setCart(data.cart))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  // Catalogue des accessoires : sert à afficher le détail du panier. Le montant
  // réellement facturé reste recalculé par le serveur à la création de la
  // session Stripe — cette liste n'est qu'un miroir de l'affichage.
  useEffect(() => {
    api
      .get('/accessories')
      .then(({ data }) => setAccessories(Array.isArray(data?.accessories) ? data.accessories : []))
      .catch(() => setAccessories([]))
  }, [])

  const selectedAccessories = useMemo(() => {
    const ids = Array.isArray(cart?.configurationData?.accessoryIds)
      ? cart.configurationData.accessoryIds
      : []
    return accessories.filter((item) => ids.includes(item.id))
  }, [accessories, cart?.configurationData])

  const accessoriesTotal = selectedAccessories.reduce(
    (sum, item) => sum + (Number(item.price) || 0),
    0,
  )
  const total = cart?.basePrice != null ? cart.basePrice + accessoriesTotal : null

  const handlePay = async () => {
    if (!cart) return
    setPaying(true)
    setPayError('')
    try {
      const { data } = await api.post(
        '/payments/create-checkout-session',
        { cartId: cart.id },
        { headers: { Authorization: `Bearer ${getAuthToken()}` } },
      )
      window.location.href = data.url
    } catch (err) {
      setPayError(
        err.response?.data?.error || t('cart.payError'),
      )
      setPaying(false)
    }
  }

  return (
    <div className="min-h-screen bg-background dark:bg-gray-950">
      <header className="relative overflow-hidden bg-bmw-dark">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,102,177,0.35),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(0,102,177,0.2),transparent_60%)]"
        />
        <Navbar />
        <div className="relative mx-auto w-[min(88vw,1500px)] px-4 pb-12 pt-32 md:px-8">
          <h1 className="font-manrope text-4xl font-extralight uppercase tracking-tight text-white md:text-5xl md:leading-tight">
            {t('nav.cart')}
          </h1>
        </div>
      </header>

      <main className="mx-auto w-[min(88vw,1500px)] px-4 pb-24 pt-10 md:px-8">
        {loading && (
          <p className="py-16 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('cart.loading')}
          </p>
        )}

        {!loading && error && (
          <p className="py-16 text-center text-sm text-gray-600 dark:text-gray-300">
            {t('cart.error')}
          </p>
        )}

        {!loading && !error && !cart && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('cart.emptyTitle')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('cart.emptyText')}
            </p>
            <Link
              to="/all-models"
              className="mt-2 rounded-md bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
            >
              {t('cart.browseModels')}
            </Link>
          </div>
        )}

        {!loading && !error && cart && (
          <div className="mx-auto max-w-3xl">
            <h2 className="font-manrope text-xl font-semibold text-gray-900 dark:text-white">
              {cart.modelName}
            </h2>

            <div className="mt-6 flex flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center dark:border-gray-700 dark:bg-gray-900">
              <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-bmw-dark via-[#16345c] to-bmw-blue sm:w-52">
                {cart.image ? (
                  <img
                    src={cart.image}
                    alt={cart.modelName}
                    onError={(e) => {
                      e.currentTarget.src = '/images/placeholder-vehicle.svg'
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 px-3 text-center">
                    <DrivetrainIcon size={28} className="text-white/70" />
                    <p className="font-manrope text-xs font-semibold uppercase tracking-wide text-white/80">
                      {cart.modelName}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-5">
                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {cart.modelName}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {cart.basePrice != null
                        ? formatPrice(cart.basePrice, 'en-GB')
                        : t('allModels.priceOnRequest')}
                    </span>
                  </div>

                  {selectedAccessories.map((item) => (
                    <div
                      key={item.id}
                      className="mt-2 flex items-baseline justify-between gap-4"
                    >
                      <span className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        {item.image && (
                          <img
                            src={item.image}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                            className="h-8 w-8 rounded border border-zinc-200 bg-white object-contain dark:border-gray-700"
                          />
                        )}
                        {item.name}
                        {!item.inStock && (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
                            {t('configure.section.outOfStock')}
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatPrice(item.price, 'en-GB')}
                      </span>
                    </div>
                  ))}

                  <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-zinc-200 pt-4 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {t('cart.totalPrice')}
                    </span>
                    <span className="font-manrope text-3xl font-semibold text-gray-900 dark:text-white">
                      {total != null
                        ? formatPrice(total, 'en-GB')
                        : t('allModels.priceOnRequest')}
                    </span>
                  </div>
                </div>

                {cart.basePrice == null ? (
                  <button
                    type="button"
                    disabled
                    className="rounded-md bg-gray-200 px-6 py-3 text-sm font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  >
                    {t('cart.disabledPrice')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={paying}
                    className="rounded-md bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                  >
                    {paying ? t('cart.paying') : t('cart.payNow')}
                  </button>
                )}

                {payError && (
                  <p className="text-sm text-destructive">{payError}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer noTopBorder />
      <ScrollToTopButton />
    </div>
  )
}

export default Cart