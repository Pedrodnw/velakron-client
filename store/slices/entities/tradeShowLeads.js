import { createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../../api'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'

const initialState = {
  items: [],
  counts: null,
  capabilities: { can_delete: false },
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
      state.capabilities = action.payload?.data?.capabilities || { can_delete: false }
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

export const loadTradeShowLeadDetail = id => apiCallBegan({
  url: `/trade-show/leads/${id}`,
  organizationScoped: true,
  requestKey: `trade-show-lead-${id}`,
})

export const createTradeShowLeadNote = (id, data) => apiCallBegan({
  url: `/trade-show/leads/${id}/notes`,
  method: 'post',
  data,
  organizationScoped: true,
  requestKey: `trade-show-lead-note-${id}`,
})

export const deleteTradeShowLead = id => apiCallBegan({
  url: `/trade-show/leads/${id}`,
  method: 'delete',
  data: { confirmation: 'DELETE' },
  organizationScoped: true,
  requestKey: `trade-show-lead-delete-${id}`,
})

const root = state => state.entities.tradeShowLeads
export const tradeShowLeadSelectors = {
  getItems: state => root(state).items,
  getCounts: state => root(state).counts,
  getCapabilities: state => root(state).capabilities,
  getPagination: state => root(state).pagination,
  getLoading: state => root(state).loading,
  getError: state => root(state).error,
}

export default slice.reducer
