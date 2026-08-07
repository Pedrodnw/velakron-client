export const resultError = (result, fallback) => result?.error?.message || fallback

export const safeReturnPath = value => {
  const path = typeof value === 'string' ? value : ''
  return path.startsWith('/') && !path.startsWith('//') ? path : '/app'
}
