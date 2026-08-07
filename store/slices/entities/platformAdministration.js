import { createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../../api'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'

const collection = () => ({ items: [], pagination: null, loading: false, error: null })
const initialState = {
  summary: null,
  summaryLoading: false,
  summaryError: null,
  users: collection(),
  relationships: collection(),
  audit: collection(),
  productMetrics: [],
  metricsLoading: false,
  operations: null,
  operationsLoading: false,
  operationsError: null,
  detailsByOrganization: {},
  detailLoading: false,
  detailError: null,
  mutating: false,
  mutationError: null,
}

const slice = createSlice({
  name: 'platformAdministration',
  initialState,
  reducers: {
    summaryRequested: state => { state.summaryLoading = true; state.summaryError = null },
    summaryReceived: (state, action) => { state.summary = action.payload?.data || null; state.summaryLoading = false },
    summaryFailed: (state, action) => { state.summaryLoading = false; state.summaryError = action.payload?.error || action.payload },
    usersRequested: state => { state.users.loading = true; state.users.error = null },
    usersReceived: (state, action) => { state.users.items = action.payload?.data?.memberships || []; state.users.pagination = action.payload?.meta || null; state.users.loading = false },
    usersFailed: (state, action) => { state.users.loading = false; state.users.error = action.payload?.error || action.payload },
    relationshipsRequested: state => { state.relationships.loading = true; state.relationships.error = null },
    relationshipsReceived: (state, action) => { state.relationships.items = action.payload?.data?.relationships || []; state.relationships.pagination = action.payload?.meta || null; state.relationships.loading = false },
    relationshipsFailed: (state, action) => { state.relationships.loading = false; state.relationships.error = action.payload?.error || action.payload },
    auditRequested: state => { state.audit.loading = true; state.audit.error = null },
    auditReceived: (state, action) => { state.audit.items = action.payload?.data?.audit_events || []; state.audit.pagination = action.payload?.meta || null; state.audit.loading = false },
    auditFailed: (state, action) => { state.audit.loading = false; state.audit.error = action.payload?.error || action.payload },
    metricsRequested: state => { state.metricsLoading = true },
    metricsReceived: (state, action) => { state.productMetrics = action.payload?.data?.metrics || []; state.metricsLoading = false },
    metricsFailed: state => { state.metricsLoading = false },
    operationsRequested: state => { state.operationsLoading = true; state.operationsError = null },
    operationsReceived: (state, action) => { state.operations = action.payload?.data || null; state.operationsLoading = false },
    operationsFailed: (state, action) => { state.operationsLoading = false; state.operationsError = action.payload?.error || action.payload },
    detailRequested: state => { state.detailLoading = true; state.detailError = null },
    detailReceived: (state, action) => {
      const detail = action.payload?.data
      const id = detail?.organization?.id || detail?.organization?._id
      if (id) state.detailsByOrganization[String(id)] = detail
      state.detailLoading = false
    },
    detailFailed: (state, action) => { state.detailLoading = false; state.detailError = action.payload?.error || action.payload },
    mutationRequested: state => { state.mutating = true; state.mutationError = null },
    mutationFinished: state => { state.mutating = false },
    mutationFailed: (state, action) => { state.mutating = false; state.mutationError = action.payload?.error || action.payload },
  },
  extraReducers: builder => {
    builder.addCase(organizationContextCleared, () => initialState)
    builder.addCase(organizationSwitchRequested, () => initialState)
  },
})

const actions = slice.actions
const supportHeaders = reason => ({ 'X-Velakron-Support-Reason': reason })
const call = options => apiCallBegan({ organizationScoped: true, ...options })

export const loadPlatformSummary = () => call({
  url: '/platform/summary', onStart: actions.summaryRequested.type,
  onSuccess: actions.summaryReceived.type, onError: actions.summaryFailed.type,
  requestKey: 'platform-summary',
})

export const loadPlatformUsers = (params, reason) => call({
  url: '/platform/users', params, headers: supportHeaders(reason),
  onStart: actions.usersRequested.type, onSuccess: actions.usersReceived.type,
  onError: actions.usersFailed.type, requestKey: 'platform-users',
})

export const loadPlatformRelationships = (params, reason) => call({
  url: '/platform/relationships', params, headers: supportHeaders(reason),
  onStart: actions.relationshipsRequested.type, onSuccess: actions.relationshipsReceived.type,
  onError: actions.relationshipsFailed.type, requestKey: 'platform-relationships',
})

export const loadPlatformAudit = (params, reason) => call({
  url: '/platform/audit-events', params, headers: supportHeaders(reason),
  onStart: actions.auditRequested.type, onSuccess: actions.auditReceived.type,
  onError: actions.auditFailed.type, requestKey: 'platform-audit',
})

export const loadProductMetrics = (params, reason) => call({
  url: '/platform/product-metrics', params, headers: supportHeaders(reason),
  onStart: actions.metricsRequested.type, onSuccess: actions.metricsReceived.type,
  onError: actions.metricsFailed.type, requestKey: 'platform-product-metrics',
})

export const loadPlatformOperations = reason => call({
  url: '/platform/operations', headers: supportHeaders(reason),
  onStart: actions.operationsRequested.type, onSuccess: actions.operationsReceived.type,
  onError: actions.operationsFailed.type, requestKey: 'platform-operations',
})

export const retryPlatformOutbox = (id, retryReason, supportReason) => async dispatch => {
  dispatch(actions.mutationRequested())
  const result = await dispatch(call({
    url: `/platform/operations/outbox/${id}/retry`, method: 'post',
    data: { reason: retryReason }, headers: supportHeaders(supportReason),
    onError: actions.mutationFailed.type, requestKey: `platform-outbox-retry-${id}`,
  }))
  if (result?.ok) dispatch(actions.mutationFinished())
  return result
}

export const loadPlatformOrganization = (id, reason) => call({
  url: `/platform/organizations/${id}/overview`, headers: supportHeaders(reason),
  onStart: actions.detailRequested.type, onSuccess: actions.detailReceived.type,
  onError: actions.detailFailed.type, requestKey: `platform-organization-${id}`,
})

export const updatePlatformOrganizationStatus = (id, data, reason) => async dispatch => {
  dispatch(actions.mutationRequested())
  const result = await dispatch(call({
    url: `/organizations/${id}/status`, method: 'patch', data,
    headers: supportHeaders(reason), onError: actions.mutationFailed.type,
    requestKey: `platform-organization-status-${id}`,
  }))
  if (result?.ok) dispatch(actions.mutationFinished())
  return result
}

export const createPlatformOrganization = (data, reason) => async dispatch => {
  dispatch(actions.mutationRequested())
  const result = await dispatch(call({
    url: '/organizations', method: 'post', data,
    headers: supportHeaders(reason), onError: actions.mutationFailed.type,
    requestKey: 'platform-organization-create',
  }))
  if (result?.ok) dispatch(actions.mutationFinished())
  return result
}

export const invitePlatformOrganizationAdmin = (organizationId, data, reason) => async dispatch => {
  dispatch(actions.mutationRequested())
  const result = await dispatch(call({
    url: `/organizations/${organizationId}/invitations`, method: 'post', data,
    headers: supportHeaders(reason), onError: actions.mutationFailed.type,
    requestKey: `platform-invitation-${organizationId}`,
  }))
  if (result?.ok) dispatch(actions.mutationFinished())
  return result
}

export const revokePlatformInvitation = (organizationId, invitationId, revokeReason, supportReason) => async dispatch => {
  dispatch(actions.mutationRequested())
  const result = await dispatch(call({
    url: `/organizations/${organizationId}/invitations/${invitationId}`,
    method: 'delete', data: { reason: revokeReason }, headers: supportHeaders(supportReason),
    onError: actions.mutationFailed.type, requestKey: `platform-invitation-revoke-${invitationId}`,
  }))
  if (result?.ok) dispatch(actions.mutationFinished())
  return result
}

export const updatePlatformUserStatus = (userId, data, reason) => async dispatch => {
  dispatch(actions.mutationRequested())
  const result = await dispatch(call({
    url: `/users/${userId}/status`, method: 'patch', data,
    headers: supportHeaders(reason), onError: actions.mutationFailed.type,
    requestKey: `platform-user-status-${userId}`,
  }))
  if (result?.ok) dispatch(actions.mutationFinished())
  return result
}

export const updatePlatformRelationship = (relationshipId, data, reason) => async dispatch => {
  dispatch(actions.mutationRequested())
  const result = await dispatch(call({
    url: `/relationships/${relationshipId}`, method: 'patch', data,
    headers: supportHeaders(reason), onError: actions.mutationFailed.type,
    requestKey: `platform-relationship-${relationshipId}`,
  }))
  if (result?.ok) dispatch(actions.mutationFinished())
  return result
}

export const trackProductEvent = (eventName, surface) => call({
  url: '/product-events', method: 'post', data: { event_name: eventName, surface },
  requestKey: `product-event-${eventName}-${surface}`,
})

const root = state => state.entities.platformAdministration
export const platformSelectors = {
  getSummary: state => root(state).summary,
  getSummaryLoading: state => root(state).summaryLoading,
  getSummaryError: state => root(state).summaryError,
  getUsers: state => root(state).users,
  getRelationships: state => root(state).relationships,
  getAudit: state => root(state).audit,
  getProductMetrics: state => root(state).productMetrics,
  getOperations: state => root(state).operations,
  getOperationsLoading: state => root(state).operationsLoading,
  getOperationsError: state => root(state).operationsError,
  getOrganizationDetail: id => state => root(state).detailsByOrganization[String(id)] || null,
  getDetailLoading: state => root(state).detailLoading,
  getDetailError: state => root(state).detailError,
  getMutating: state => root(state).mutating,
  getMutationError: state => root(state).mutationError,
}

export default slice.reducer
