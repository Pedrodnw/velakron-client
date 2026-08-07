import { apiCallBegan } from '../../api'
import { createEntitySelectors, createNormalizedEntitySlice } from './createEntitySlice'

const slice = createNormalizedEntitySlice({ name: 'relationships', dataKey: 'relationships' })

const { listRequestFailed, listReceived, listRequested } = slice.actions

export const loadRelationships = organizationId => apiCallBegan({
  url: `/organizations/${organizationId}/relationships`,
  onStart: listRequested.type,
  onSuccess: listReceived.type,
  onError: listRequestFailed.type,
  requestKey: 'relationships-list',
  organizationScoped: true,
})

export const updateRelationship = (id, payload) => apiCallBegan({
  url: `/relationships/${id}`,
  method: 'patch',
  data: payload,
  onStart: listRequested.type,
  onError: listRequestFailed.type,
  requestKey: 'relationship-write',
  organizationScoped: true,
})

export const relationshipSelectors = createEntitySelectors('relationships')

export default slice.reducer
