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
    const response = await axios.request({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      url,
      method,
      data,
      params,
      headers,
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
