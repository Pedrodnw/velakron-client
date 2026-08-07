import { createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../api'

const initialState = {
  memberships: [],
  activeOrganization: null,
  activeMembership: null,
  permissions: [],
  status: 'loading',
  switching: false,
  switchingToOrganizationId: null,
  error: null,
  contextVersion: 0,
}

const contextPayload = payload => payload?.data || payload || {}

export const deriveContextStatus = context => {
  if (['suspended', 'archived'].includes(context.user?.account_status)) return 'account_suspended'
  if (
    (context.active_organization || context.activeOrganization || context.organization)
    && (context.active_membership || context.activeMembership || context.membership)
  ) return 'ready'

  const memberships = Array.isArray(context.memberships) ? context.memberships : []
  if (memberships.some(item => item.status === 'active' && item.organization?.status === 'suspended')) {
    return 'organization_suspended'
  }
  if (memberships.some(item => item.status === 'suspended')) return 'membership_suspended'
  if (memberships.some(item => item.status === 'invited')) return 'invitation_pending'
  return 'no_membership'
}

const applyContext = (state, payload) => {
  const context = contextPayload(payload)
  state.memberships = Array.isArray(context.memberships) ? context.memberships : state.memberships
  state.activeOrganization = context.active_organization || context.activeOrganization || context.organization || null
  state.activeMembership = context.active_membership || context.activeMembership || context.membership || null
  state.permissions = Array.isArray(context.permissions) ? context.permissions : []
  state.status = deriveContextStatus(context)
  state.switching = false
  state.switchingToOrganizationId = null
  state.error = null
  state.contextVersion += 1
}

const hasOrganizationContext = payload => {
  const context = contextPayload(payload)
  return Array.isArray(context.memberships)
    || Object.prototype.hasOwnProperty.call(context, 'active_organization')
    || Object.prototype.hasOwnProperty.call(context, 'activeOrganization')
}

const clearContext = state => ({
  ...initialState,
  status: 'no_membership',
  contextVersion: state.contextVersion + 1,
})

const slice = createSlice({
  name: 'appContext',
  initialState,
  reducers: {
    organizationContextRequested: state => {
      state.status = 'loading'
      state.error = null
    },
    organizationContextReceived: (state, action) => {
      applyContext(state, action.payload)
    },
    organizationContextFailed: (state, action) => {
      state.status = 'error'
      state.error = action.payload?.error || action.payload
    },
    organizationSwitchRequested: (state, action) => {
      state.switching = true
      state.switchingToOrganizationId = action.payload
      state.error = null
      state.contextVersion += 1
    },
    organizationSwitchReceived: (state, action) => {
      applyContext(state, action.payload)
    },
    organizationSwitchFailed: (state, action) => {
      state.switching = false
      state.switchingToOrganizationId = null
      state.error = action.payload?.error || action.payload
    },
    organizationContextCleared: clearContext,
  },
  extraReducers: builder => {
    builder
      .addCase('auth/sessionReceived', (state, action) => {
        if (hasOrganizationContext(action.payload)) applyContext(state, action.payload)
      })
      .addCase('auth/authRequestSucceeded', (state, action) => {
        if (hasOrganizationContext(action.payload)) applyContext(state, action.payload)
      })
      .addCase('auth/sessionFailed', clearContext)
      .addCase('auth/signedOut', clearContext)
  },
})

export const {
  organizationContextCleared,
  organizationContextFailed,
  organizationContextReceived,
  organizationContextRequested,
  organizationSwitchFailed,
  organizationSwitchReceived,
  organizationSwitchRequested,
} = slice.actions

export const loadOrganizationContext = () => apiCallBegan({
  url: '/organizations/current',
  onStart: organizationContextRequested.type,
  onSuccess: organizationContextReceived.type,
  onError: organizationContextFailed.type,
  requestKey: 'organization-context',
})

export const switchOrganization = organizationId => dispatch => {
  dispatch(organizationSwitchRequested(organizationId))
  return dispatch(apiCallBegan({
    url: '/auth/organization',
    method: 'post',
    data: { organization_id: organizationId },
    onSuccess: organizationSwitchReceived.type,
    onError: organizationSwitchFailed.type,
    requestKey: 'organization-switch',
  }))
}

export const getActiveOrganization = state => state.appContext.activeOrganization
export const getActiveMembership = state => state.appContext.activeMembership
export const getAvailableMemberships = state => state.appContext.memberships
export const getAppContextError = state => state.appContext.error
export const getAppContextStatus = state => state.appContext.status
export const getEffectivePermissions = state => state.appContext.permissions
export const getOrganizationContextVersion = state => state.appContext.contextVersion
export const getOrganizationSwitching = state => state.appContext.switching
export const getSwitchingToOrganizationId = state => state.appContext.switchingToOrganizationId
export const getHasPermission = permission => state => (
  state.appContext.permissions.includes(permission)
)

export default slice.reducer
