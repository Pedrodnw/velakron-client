import { apiCallBegan } from './api'

export const crmRequest = ({ url, method = 'get', data, params, headers, requestKey }) => apiCallBegan({
  url: `/crm${url}`,
  method,
  data,
  params,
  headers,
  organizationScoped: true,
  requestKey: requestKey || `crm-${method}-${url}`,
})

export const crmErrorMessage = (result, fallback = 'The CRM request could not be completed.') => (
  result?.error?.message || result?.error?.error?.message || fallback
)
