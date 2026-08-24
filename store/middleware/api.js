import axios from 'axios'
import { apiCallBegan, apiCallCancelled, apiCallFailed, apiCallSuccess } from '../api'

const activeRequests = new Map()

const api = ({ dispatch, getState }) => next => async action => {
  if (action.type !== apiCallBegan.type) return next(action)

  const {
    url,
    method = 'get',
    data,
    params,
    headers,
    onStart,
    onSuccess,
    onError,
    requestKey,
    organizationScoped = false,
  } = action.payload

  if (requestKey) activeRequests.get(requestKey)?.abort()
  const controller = new AbortController()
  if (requestKey) activeRequests.set(requestKey, controller)
  const contextVersion = getState().appContext?.contextVersion

  if (onStart) dispatch({ type: onStart })
  next(action)

  try {
    const previewExchangeRequest = typeof window !== 'undefined'
      && window.location.pathname === '/sales-demo/preview'
      && ['/auth/session', '/sales-demos/presenter-grants/exchange'].includes(String(url))
    const presenterToken = typeof window !== 'undefined' && !previewExchangeRequest
      ? window.sessionStorage.getItem('velakron_sales_demo_presenter')
      : null
    const response = await axios.request({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      url,
      method,
      data,
      params,
      headers: {
        ...(presenterToken ? { 'X-Velakron-Demo-Presenter': presenterToken } : {}),
        ...headers,
      },
      withCredentials: true,
      signal: controller.signal,
    })

    const staleOrganization = organizationScoped
      && getState().appContext?.contextVersion !== contextVersion
    if (staleOrganization) {
      dispatch(apiCallCancelled({ reason: 'organization_context_changed', requestKey }))
      return { ok: false, cancelled: true }
    }

    dispatch(apiCallSuccess(response.data))
    if (onSuccess) dispatch({ type: onSuccess, payload: response.data })
    if (
      typeof window !== 'undefined'
      && method.toLowerCase() !== 'get'
      && getState().appContext?.activeOrganization?.demo_workspace
      && !String(url).startsWith('/sales-demos/current/')
      && String(url) !== '/product-events'
    ) {
      window.dispatchEvent(new CustomEvent('velakron:demo-mutation-completed', {
        detail: { method: method.toLowerCase(), path: String(url).split('?')[0].slice(0, 160) },
      }))
    }
    return { ok: true, payload: response.data }
  } catch (error) {
    if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
      dispatch(apiCallCancelled({ reason: 'request_cancelled', requestKey }))
      return { ok: false, cancelled: true }
    }
    const payload = error.response?.data || { message: error.message }
    dispatch(apiCallFailed(payload))
    if (onError) dispatch({ type: onError, payload })
    return { ok: false, error: payload?.error || payload }
  } finally {
    if (requestKey && activeRequests.get(requestKey) === controller) {
      activeRequests.delete(requestKey)
    }
  }
}

export default api
