import { apiCallBegan } from '../../api'
import { createEntitySelectors, createNormalizedEntitySlice } from './createEntitySlice'

const slice = createNormalizedEntitySlice({
  name: 'memberships',
  dataKey: 'memberships',
  reducers: {
    membershipReceived: (state, action) => {
      const membership = action.payload?.data?.membership
      if (!membership?.id) return
      if (!state.ids.includes(membership.id)) state.ids.push(membership.id)
      state.byId[membership.id] = {
        ...(state.byId[membership.id] || {}),
        ...membership,
      }
      state.loading = false
      state.error = null
    },
  },
})

const { listRequestFailed, listReceived, listRequested, membershipReceived } = slice.actions

export const loadMemberships = organizationId => apiCallBegan({
  url: `/organizations/${organizationId}/memberships`,
  onStart: listRequested.type,
  onSuccess: listReceived.type,
  onError: listRequestFailed.type,
  requestKey: 'memberships-list',
  organizationScoped: true,
})

export const membershipSelectors = createEntitySelectors('memberships')

export const updateMembership = (membershipId, data) => apiCallBegan({
  url: `/memberships/${membershipId}`,
  method: 'patch',
  data,
  onSuccess: membershipReceived.type,
  onError: listRequestFailed.type,
  organizationScoped: true,
})

export default slice.reducer
