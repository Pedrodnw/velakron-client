import { apiCallBegan } from '../../api'
import { createEntitySelectors, createNormalizedEntitySlice } from './createEntitySlice'

const slice = createNormalizedEntitySlice({
  name: 'invitations',
  dataKey: 'invitations',
  reducers: {
    invitationReceived: (state, action) => {
      const invitation = action.payload?.data?.invitation
      if (!invitation?.id) return
      if (!state.ids.includes(invitation.id)) state.ids.unshift(invitation.id)
      state.byId[invitation.id] = invitation
      state.loading = false
      state.error = null
    },
  },
})

const {
  invitationReceived,
  listRequestFailed,
  listReceived,
  listRequested,
} = slice.actions

export const loadInvitations = (organizationId, status) => apiCallBegan({
  url: `/organizations/${organizationId}/invitations`,
  params: { status: status || undefined },
  onStart: listRequested.type,
  onSuccess: listReceived.type,
  onError: listRequestFailed.type,
  requestKey: 'invitations-list',
  organizationScoped: true,
})

export const inviteMember = (organizationId, data) => apiCallBegan({
  url: `/organizations/${organizationId}/invitations`, method: 'post', data,
  onSuccess: invitationReceived.type, onError: listRequestFailed.type, organizationScoped: true,
})
export const inviteSupplier = (organizationId, data) => apiCallBegan({
  url: `/organizations/${organizationId}/invitations/supplier`, method: 'post', data,
  onSuccess: invitationReceived.type, onError: listRequestFailed.type, organizationScoped: true,
})
export const resendInvitation = (organizationId, invitationId) => apiCallBegan({
  url: `/organizations/${organizationId}/invitations/${invitationId}/resend`, method: 'post',
  onSuccess: invitationReceived.type, onError: listRequestFailed.type, organizationScoped: true,
})
export const revokeInvitation = (organizationId, invitationId, reason) => apiCallBegan({
  url: `/organizations/${organizationId}/invitations/${invitationId}`, method: 'delete', data: { reason },
  onSuccess: invitationReceived.type, onError: listRequestFailed.type, organizationScoped: true,
})

export const invitationSelectors = createEntitySelectors('invitations')
export default slice.reducer
