import { createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../../api'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'

const initialState = {
  summary: null,
  sessions: [],
  sessionPagination: null,
  templates: [],
  campaigns: [],
  loading: false,
  error: null,
}

const slice = createSlice({
  name: 'salesDemos',
  initialState,
  reducers: {
    requested: state => { state.loading = true; state.error = null },
    summaryReceived: (state, action) => { state.summary = action.payload?.data || null; state.loading = false },
    sessionsReceived: (state, action) => {
      state.sessions = action.payload?.data?.sessions || []
      state.sessionPagination = action.payload?.meta || null
      state.loading = false
    },
    templatesReceived: (state, action) => { state.templates = action.payload?.data?.templates || []; state.loading = false },
    campaignsReceived: (state, action) => { state.campaigns = action.payload?.data?.campaigns || []; state.loading = false },
    failed: (state, action) => { state.loading = false; state.error = action.payload?.error || action.payload },
  },
  extraReducers: builder => {
    builder.addCase(organizationContextCleared, () => initialState)
    builder.addCase(organizationSwitchRequested, () => initialState)
  },
})

const actions = slice.actions
const request = ({ url, method = 'get', data, params, requestKey, onSuccess }) => apiCallBegan({
  url,
  method,
  data,
  params,
  organizationScoped: true,
  requestKey,
  onStart: actions.requested.type,
  onSuccess,
  onError: actions.failed.type,
})

export const loadSalesDemoSummary = () => request({ url: '/sales-demos/summary', requestKey: 'sales-demo-summary', onSuccess: actions.summaryReceived.type })
export const loadSalesDemoSessions = params => request({ url: '/sales-demos/sessions', params, requestKey: 'sales-demo-sessions', onSuccess: actions.sessionsReceived.type })
export const loadSalesDemoTemplates = () => request({ url: '/sales-demos/templates', requestKey: 'sales-demo-templates', onSuccess: actions.templatesReceived.type })
export const loadSalesDemoCampaigns = () => request({ url: '/sales-demos/campaigns', requestKey: 'sales-demo-campaigns', onSuccess: actions.campaignsReceived.type })

export const salesDemoRequest = ({ url, method = 'get', data, params, requestKey = 'sales-demo-mutation' }) => request({
  url: `/sales-demos${url}`,
  method,
  data,
  params,
  requestKey,
})

const root = state => state.entities.salesDemos
export const salesDemoSelectors = {
  getSummary: state => root(state).summary,
  getSessions: state => root(state).sessions,
  getSessionPagination: state => root(state).sessionPagination,
  getTemplates: state => root(state).templates,
  getCampaigns: state => root(state).campaigns,
  getLoading: state => root(state).loading,
  getError: state => root(state).error,
}

export default slice.reducer
