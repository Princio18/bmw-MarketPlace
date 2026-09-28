export function formatPrice(value, locale) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: locale === 'fr-FR' ? 'EUR' : 'GBP',
    maximumFractionDigits: 0,
  }).format(value)
}