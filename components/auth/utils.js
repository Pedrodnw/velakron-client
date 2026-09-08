export const resultError = (result, fallback) => result?.error?.message || fallback

export const safeReturnPath = value => {
  const path = typeof value === 'string' ? value : ''
  return path.startsWith('/') && !path.startsWith('//') ? path : '/app'
}

export const loginPathForReturn = (value, { sessionExpired = false } = {}) => {
  const next = encodeURIComponent(safeReturnPath(value))
  return `/login?next=${next}${sessionExpired ? '&reason=session_expired' : ''}`
}
