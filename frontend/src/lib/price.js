const SEPARATOR_RE = /[\u202f\u00a0,]/g

export function formatPrice(value, locale) {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: locale === 'fr-FR' ? 'EUR' : 'GBP',
    maximumFractionDigits: 0,
  }).format(value)
  return formatted.replace(SEPARATOR_RE, ' ')
}