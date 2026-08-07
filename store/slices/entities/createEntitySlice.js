import { createSelector, createSlice } from '@reduxjs/toolkit'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'

export const createInitialEntityState = overrides => ({
  ids: [],
  byId: {},
  selected: null,
  filters: {},
  loading: false,
  loadingRecords: [],
  error: null,
  lastFetched: null,
  pagination: null,
  ...overrides,
})

const normalizeRecords = records => records.reduce((result, record) => {
  if (!record?.id && !record?._id) return result
  const id = String(record.id || record._id)
  result.ids.push(id)
  result.byId[id] = record
  return result
}, { ids: [], byId: {} })

export const createNormalizedEntitySlice = ({
  name,
  dataKey = 'records',
  initialState = {},
  reducers = {},
}) => {
  const createStartingState = () => createInitialEntityState(initialState)

  return createSlice({
    name,
    initialState: createStartingState(),
    reducers: {
      listRequested: state => {
        state.loading = true
        state.error = null
      },
      listReceived: (state, action) => {
        const records = action.payload?.data?.[dataKey] || action.payload?.data || []
        const normalized = normalizeRecords(Array.isArray(records) ? records : [])
        state.ids = normalized.ids
        state.byId = normalized.byId
        state.pagination = action.payload?.meta || null
        state.loading = false
        state.error = null
        state.lastFetched = Date.now()
      },
      listRequestFailed: (state, action) => {
        state.loading = false
        state.error = action.payload?.error || action.payload
      },
      recordReceived: (state, action) => {
        const record = action.payload?.data?.record || action.payload?.data || action.payload
        if (!record?.id && !record?._id) return
        const id = String(record.id || record._id)
        if (!state.ids.includes(id)) state.ids.push(id)
        state.byId[id] = record
        state.loadingRecords = state.loadingRecords.filter(item => item !== id)
      },
      recordRemoved: (state, action) => {
        const id = String(action.payload)
        state.ids = state.ids.filter(item => item !== id)
        delete state.byId[id]
        if (state.selected === id) state.selected = null
      },
      selectedSet: (state, action) => {
        state.selected = action.payload ? String(action.payload) : null
      },
      filtersSet: (state, action) => {
        state.filters = { ...state.filters, ...(action.payload || {}) }
      },
      filtersReset: state => {
        state.filters = {}
      },
      entityStateReset: createStartingState,
      ...reducers,
    },
    extraReducers: builder => {
      builder.addCase(organizationContextCleared, createStartingState)
      builder.addCase(organizationSwitchRequested, createStartingState)
    },
  })
}

export const createEntitySelectors = key => {
  const getEntityState = state => state.entities[key]
  const getEntityIds = state => getEntityState(state).ids
  const getEntityMap = state => getEntityState(state).byId
  const getEntities = createSelector(
    [getEntityIds, getEntityMap],
    (ids, byId) => ids.map(id => byId[id]),
  )

  return {
    getEntityState,
    getEntityIds,
    getEntities,
    getEntityById: id => state => getEntityMap(state)[String(id)] || null,
    getEntityLoading: state => getEntityState(state).loading,
    getEntityError: state => getEntityState(state).error,
    getEntityFilters: state => getEntityState(state).filters,
    getEntityPagination: state => getEntityState(state).pagination,
  }
}
