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
  lastFetched: null,
}

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
        actions: data.actions || {},
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

export const loadProductionRecord = id => async dispatch => ingestHistory(dispatch, await dispatch(apiCallBegan({
  url: `/production-records/${id}`,
  onStart: detailRequested.type,
  onSuccess: detailReceived.type,
  onError: requestFailed.type,
  requestKey: `production-record-${id}`,
  organizationScoped: true,
})))

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
export const cancelProductionRecord = (id, payload) => mutate(id, '/cancel', 'post', payload)
export const reopenProductionRecord = (id, payload) => mutate(id, '/reopen', 'post', payload)
export const archiveProductionRecord = (id, payload) => mutate(id, '/archive', 'post', payload)

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
}

export const { filtersSet } = slice.actions
export default slice.reducer
