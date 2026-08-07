import { apiCallBegan } from '../../api'
import { createEntitySelectors, createNormalizedEntitySlice } from './createEntitySlice'

const slice = createNormalizedEntitySlice({ name: 'organizations', dataKey: 'organizations' })

const { listRequestFailed, listReceived, listRequested } = slice.actions

export const loadOrganizations = ({ reason, type, status, onboarding_state, search, page = 1, page_size = 25 } = {}) => apiCallBegan({
  url: '/organizations',
  params: {
    type: type || undefined,
    status: status || undefined,
    onboarding_state: onboarding_state || undefined,
    search: search || undefined,
    page,
    page_size,
  },
  headers: { 'X-Velakron-Support-Reason': reason },
  onStart: listRequested.type,
  onSuccess: listReceived.type,
  onError: listRequestFailed.type,
  requestKey: 'organizations-list',
  organizationScoped: true,
})

export const organizationSelectors = createEntitySelectors('organizations')

export default slice.reducer
