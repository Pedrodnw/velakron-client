import { apiCallBegan } from '../../api'
import { createEntitySelectors, createNormalizedEntitySlice } from './createEntitySlice'

const slice = createNormalizedEntitySlice({ name: 'auditEvents', dataKey: 'audit_events' })

const { listRequestFailed, listReceived, listRequested } = slice.actions

export const loadAuditEvents = organizationId => apiCallBegan({
  url: `/organizations/${organizationId}/audit-events`,
  onStart: listRequested.type,
  onSuccess: listReceived.type,
  onError: listRequestFailed.type,
  requestKey: 'audit-events-list',
  organizationScoped: true,
})

export const auditEventSelectors = createEntitySelectors('auditEvents')

export default slice.reducer
