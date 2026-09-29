// Les montants du configurateur ont des décimales : on ne peut pas remplacer
// toutes les virgules par des espaces, sinon « 1 307,69 € » deviendrait
// « 1 307 69 € » en français. Les virgules ne sont donc traitées comme
// séparateurs de milliers que si la locale n'utilise pas la virgule décimale.
export function formatPrice(value, locale, maximumFractionDigits = 0) {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: locale === 'fr-FR' ? 'EUR' : 'GBP',
    maximumFractionDigits,
  })
  // Le séparateur décimal se lit sur un NumberFormat simple : sur le
  // formatter monétaire, `formatToParts` le fait disparaître quand
  // maximumFractionDigits vaut 0.
  const decimal = new Intl.NumberFormat(locale)
    .formatToParts(1.1)
    .find((part) => part.type === 'decimal')?.value
  const formatted = formatter
    .format(value)
    .replace(/[\u202f\u00a0]/g, ' ')
  return decimal && decimal !== ','
    ? formatted.replace(/,/g, ' ')
    : formatted
}