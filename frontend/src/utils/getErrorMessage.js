const MAX_INLINE_LENGTH = 300

/**
 * Extrait un message lisible depuis une erreur axios, quelle que soit la
 * forme de la réponse du serveur. L'API peut renvoyer une chaîne, un objet
 * { message }, un objet { error }, un { error: { message } } imbriqué, ou un
 * corps non-JSON (page d'erreur d'un CDN, page de maintenance).
 */
export function getErrorMessage(
  err,
  fallback = 'Something went wrong. Please try again.',
) {
  const data = err?.response?.data
  if (typeof data?.error === 'string' && data.error) return data.error
  if (typeof data?.error?.message === 'string') return data.error.message
  if (typeof data?.message === 'string' && data.message) return data.message
  if (typeof data === 'string') {
    const inline = data.trim()
    if (
      inline &&
      !inline.startsWith('<') &&
      inline.length <= MAX_INLINE_LENGTH
    ) {
      return inline
    }
  }
  if (typeof err?.message === 'string' && err.message) return err.message
  return fallback
}
