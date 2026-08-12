import { createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../../api'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'

const initialState = {
  items: [],
  counts: null,
  pagination: null,
  loading: false,
  error: null,
}

const slice = createSlice({
  name: 'tradeShowLeads',
  initialState,
  reducers: {
    leadsRequested: state => { state.loading = true; state.error = null },
    leadsReceived: (state, action) => {
      state.items = action.payload?.data?.leads || []
      state.counts = action.payload?.data?.counts || null
      state.pagination = action.payload?.meta || null
      state.loading = false
      state.error = null
    },
    leadsFailed: (state, action) => {
      state.loading = false
      state.error = action.payload?.error || action.payload
    },
  },
  extraReducers: builder => {
    builder.addCase(organizationContextCleared, () => initialState)
    builder.addCase(organizationSwitchRequested, () => initialState)
  },
})

const actions = slice.actions

export const loadTradeShowLeads = params => apiCallBegan({
  url: '/trade-show/leads',
  params,
  organizationScoped: true,
  requestKey: 'trade-show-leads',
  onStart: actions.leadsRequested.type,
  onSuccess: actions.leadsReceived.type,
  onError: actions.leadsFailed.type,
})

const root = state => state.entities.tradeShowLeads
export const tradeShowLeadSelectors = {
  getItems: state => root(state).items,
  getCounts: state => root(state).counts,
  getPagination: state => root(state).pagination,
  getLoading: state => root(state).loading,
  getError: state => root(state).error,
}

export default slice.reducer
