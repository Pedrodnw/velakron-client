import { createSelector, createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../../api'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'
import { machineAssignmentsReceived } from './machineAssignments'
import { productionEventsReceived } from './productionEvents'
import { supplierAssignmentsReceived } from './supplierAssignments'

const initialState = {
  ids: [],
  byId: {},
  detailsById: {},
  loading: false,
  detailLoading: false,
  mutating: false,
  error: null,
  mutationError: null,
  pagination: null,
  filters: {},
  workflow: null,
  warnings: [],
  revisionChangesByRecord: {},
  revisionImpactByRecord: {},
  lastFetched: null,
}
const emptyRevisionChanges = Object.freeze([])

const normalize = records => (records || []).reduce((result, record) => {
  const id = String(record.id || record._id)
  if (!id) return result
  result.ids.push(id)
  result.byId[id] = record
  return result
}, { ids: [], byId: {} })

const slice = createSlice({
  name: 'productionRecords',
  initialState,
  reducers: {
    listRequested: state => {
      state.loading = true
      state.error = null
    },
    listReceived: (state, action) => {
      const records = action.payload?.data?.records || []
      const result = normalize(records)
      state.ids = result.ids
      state.byId = { ...state.byId, ...result.byId }
      state.pagination = action.payload?.meta || null
      state.loading = false
      state.error = null
      state.lastFetched = Date.now()
    },
    detailRequested: state => {
      state.detailLoading = true
      state.error = null
    },
    detailReceived: (state, action) => {
      const data = action.payload?.data || action.payload
      const record = data?.record
      if (!record) return
      const id = String(record.id || record._id)
      if (!state.ids.includes(id)) state.ids.push(id)
      state.byId[id] = record
      state.detailsById[id] = {
        assignments: data.assignments || [],
        machineAssignments: data.machine_assignments || [],
        timeline: data.timeline || [],
        partActivity: data.part_activity || [],
        actions: data.actions || {},
        compliance: data.compliance || {},
      }
      state.workflow = data.workflow || state.workflow
      state.warnings = data.warnings || []
      state.detailLoading = false
      state.mutating = false
      state.error = null
      state.mutationError = null
    },
    requestFailed: (state, action) => {
      state.loading = false
      state.detailLoading = false
      state.error = action.payload?.error || action.payload
    },
    mutationRequested: state => {
      state.mutating = true
      state.mutationError = null
    },
    mutationFailed: (state, action) => {
      state.mutating = false
      state.mutationError = action.payload?.error || action.payload
    },
    workflowReceived: (state, action) => {
      state.workflow = action.payload?.data?.workflow || action.payload?.workflow || state.workflow
    },
    revisionChangesReceived: (state, action) => {
      state.revisionChangesByRecord[String(action.payload.recordId)] = action.payload.changes || []
    },
    revisionImpactReceived: (state, action) => {
      state.revisionImpactByRecord[String(action.payload.recordId)] = action.payload.impact || null
    },
    filtersSet: (state, action) => {
      state.filters = { ...state.filters, ...(action.payload || {}) }
    },
  },
  extraReducers: builder => {
    builder.addCase(organizationContextCleared, () => initialState)
    builder.addCase(organizationSwitchRequested, () => initialState)
  },
})

const {
  detailReceived,
  detailRequested,
  listReceived,
  listRequested,
  mutationFailed,
  mutationRequested,
  requestFailed,
  revisionChangesReceived,
  revisionImpactReceived,
  workflowReceived,
} = slice.actions

const ingestHistory = (dispatch, result) => {
  if (!result?.ok) return result
  const data = result.payload?.data || {}
  dispatch(supplierAssignmentsReceived(data.assignments || []))
  dispatch(machineAssignmentsReceived(data.machine_assignments || []))
  dispatch(productionEventsReceived(data.timeline || []))
  return result
}

export const loadProductionRecords = (params = {}) => apiCallBegan({
  url: '/production-records',
  params,
  onStart: listRequested.type,
  onSuccess: listReceived.type,
  onError: requestFailed.type,
  requestKey: 'production-records-list',
  organizationScoped: true,
})

const supplierFallbackOrder = ['active', 'action_required', 'completed']

export const findFirstNonEmptySupplierProductionView = currentView => async dispatch => {
  const candidates = supplierFallbackOrder.filter(view => view !== currentView)
  for (const view of candidates) {
    const result = await dispatch(apiCallBegan({
      url: '/production-records',
      params: { view, page: 1, page_size: 1 },
      requestKey: `production-records-view-check-${view}`,
      organizationScoped: true,
    }))
    if (!result?.ok) return null
    const total = Number(result.payload?.meta?.total ?? result.payload?.data?.records?.length ?? 0)
    if (total > 0) return view
  }
  return null
}

export const loadProductionRecord = id => async dispatch => ingestHistory(dispatch, await dispatch(apiCallBegan({
  url: `/production-records/${id}`,
  onStart: detailRequested.type,
  onSuccess: detailReceived.type,
  onError: requestFailed.type,
  requestKey: `production-record-${id}`,
  organizationScoped: true,
})))

export const loadProductionWorkflow = () => apiCallBegan({
  url: '/production-records/workflow',
  onSuccess: workflowReceived.type,
  onError: requestFailed.type,
  requestKey: 'production-workflow',
  organizationScoped: true,
})

const mutate = (id, path, method, data) => async dispatch => ingestHistory(dispatch, await dispatch(apiCallBegan({
  url: id ? `/production-records/${id}${path}` : '/production-records',
  method,
  data,
  onStart: mutationRequested.type,
  onSuccess: detailReceived.type,
  onError: mutationFailed.type,
  requestKey: `production-record-mutation-${id || 'create'}`,
  organizationScoped: true,
})))

export const createProductionRecord = payload => mutate(null, '', 'post', payload)
export const editProductionRecord = (id, payload) => mutate(id, '', 'patch', payload)
export const assignProductionRecord = (id, payload) => mutate(id, '/assign', 'post', payload)
export const acceptProductionRecord = (id, payload) => mutate(id, '/accept', 'post', payload)
export const declineProductionRecord = (id, payload) => mutate(id, '/decline', 'post', payload)
export const assignProductionMachine = (id, payload) => mutate(id, '/machine', 'post', payload)
export const transitionProductionRecord = (id, payload) => mutate(id, '/transition', 'post', payload)
export const confirmProductionDelivery = (id, payload) => mutate(id, '/confirm-delivery', 'post', payload)
export const reportProductionQualityIssue = (id, payload) => mutate(id, '/report-quality-issue', 'post', payload)
export const approveProductionQuality = (id, payload) => mutate(id, '/approve-quality', 'post', payload)
export const cancelProductionRecord = (id, payload) => mutate(id, '/cancel', 'post', payload)
export const reopenProductionRecord = (id, payload) => mutate(id, '/reopen', 'post', payload)
export const archiveProductionRecord = (id, payload) => mutate(id, '/archive', 'post', payload)

export const loadProductionRevisionChanges = id => async dispatch => {
  const result = await dispatch(apiCallBegan({ url: `/production-records/${id}/revision-changes`, organizationScoped: true, requestKey: `production-revision-changes-${id}` }))
  if (result?.ok) dispatch(revisionChangesReceived({ recordId: id, changes: result.payload?.data?.changes || [] }))
  return result
}

export const loadProductionRevisionImpact = (id, revisionId) => async dispatch => {
  const result = await dispatch(apiCallBegan({ url: `/production-records/${id}/revision-impact`, params: { to_revision_id: revisionId }, organizationScoped: true, requestKey: `production-revision-impact-${id}` }))
  if (result?.ok) dispatch(revisionImpactReceived({ recordId: id, impact: result.payload?.data?.impact }))
  return result
}

export const proposeProductionRevisionChange = (id, data) => apiCallBegan({ url: `/production-records/${id}/revision-changes`, method: 'post', data, organizationScoped: true, onStart: mutationRequested.type, onError: mutationFailed.type, requestKey: `production-revision-change-propose-${id}` })
export const actOnProductionRevisionChange = (id, changeId, data) => apiCallBegan({ url: `/production-records/${id}/revision-changes/${changeId}/actions`, method: 'post', data, organizationScoped: true, onStart: mutationRequested.type, onError: mutationFailed.type, requestKey: `production-revision-change-action-${changeId}` })

const stateFor = state => state.entities.productionRecords
export const productionRecordSelectors = {
  getState: stateFor,
  getRecords: createSelector(
    [state => stateFor(state).ids, state => stateFor(state).byId],
    (ids, byId) => ids.map(id => byId[id]),
  ),
  getRecordById: id => state => stateFor(state).byId[String(id)] || null,
  getDetailById: id => state => stateFor(state).detailsById[String(id)] || null,
  getLoading: state => stateFor(state).loading,
  getDetailLoading: state => stateFor(state).detailLoading,
  getMutating: state => stateFor(state).mutating,
  getError: state => stateFor(state).error,
  getMutationError: state => stateFor(state).mutationError,
  getPagination: state => stateFor(state).pagination,
  getWorkflow: state => stateFor(state).workflow,
  getWarnings: state => stateFor(state).warnings,
  getRevisionChanges: id => state => stateFor(state).revisionChangesByRecord[String(id)] || emptyRevisionChanges,
  getRevisionImpact: id => state => stateFor(state).revisionImpactByRecord[String(id)] || null,
}

export const { filtersSet } = slice.actions
export default slice.reducer
