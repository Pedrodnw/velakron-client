import { createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../../api'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'

const initialState = {
  summary: null,
  sessions: [],
  sessionPagination: null,
  templates: [],
  partPresets: [],
  defaultPartPresetKey: '',
  recipes: [],
  scenarioModules: [],
  campaigns: [],
  loadingByResource: { summary: false, sessions: false, templates: false, campaigns: false, mutation: false },
  error: null,
}

const slice = createSlice({
  name: 'salesDemos',
  initialState,
  reducers: {
    summaryRequested: state => { state.loadingByResource.summary = true; state.error = null },
    sessionsRequested: state => { state.loadingByResource.sessions = true; state.error = null },
    templatesRequested: state => { state.loadingByResource.templates = true; state.error = null },
    campaignsRequested: state => { state.loadingByResource.campaigns = true; state.error = null },
    mutationRequested: state => { state.loadingByResource.mutation = true; state.error = null },
    summaryReceived: (state, action) => { state.summary = action.payload?.data || null; state.loadingByResource.summary = false },
    sessionsReceived: (state, action) => {
      state.sessions = action.payload?.data?.sessions || []
      state.sessionPagination = action.payload?.meta || null
      state.loadingByResource.sessions = false
    },
    templatesReceived: (state, action) => {
      state.templates = action.payload?.data?.templates || []
      state.partPresets = action.payload?.data?.part_presets || []
      state.defaultPartPresetKey = action.payload?.data?.default_part_preset_key || ''
      state.recipes = action.payload?.data?.recipes || []
      state.scenarioModules = action.payload?.data?.scenario_modules || []
      state.loadingByResource.templates = false
    },
    campaignsReceived: (state, action) => { state.campaigns = action.payload?.data?.campaigns || []; state.loadingByResource.campaigns = false },
    mutationReceived: state => { state.loadingByResource.mutation = false },
    summaryFailed: (state, action) => { state.loadingByResource.summary = false; state.error = action.payload?.error || action.payload },
    sessionsFailed: (state, action) => { state.loadingByResource.sessions = false; state.error = action.payload?.error || action.payload },
    templatesFailed: (state, action) => { state.loadingByResource.templates = false; state.error = action.payload?.error || action.payload },
    campaignsFailed: (state, action) => { state.loadingByResource.campaigns = false; state.error = action.payload?.error || action.payload },
    mutationFailed: (state, action) => { state.loadingByResource.mutation = false; state.error = action.payload?.error || action.payload },
  },
  extraReducers: builder => {
    builder.addCase(organizationContextCleared, () => initialState)
    builder.addCase(organizationSwitchRequested, () => initialState)
  },
})

const actions = slice.actions
const resourceActions = {
  summary: { started: actions.summaryRequested.type, failed: actions.summaryFailed.type },
  sessions: { started: actions.sessionsRequested.type, failed: actions.sessionsFailed.type },
  templates: { started: actions.templatesRequested.type, failed: actions.templatesFailed.type },
  campaigns: { started: actions.campaignsRequested.type, failed: actions.campaignsFailed.type },
  mutation: { started: actions.mutationRequested.type, failed: actions.mutationFailed.type },
}

const request = ({ url, method = 'get', data, params, requestKey, onSuccess, resource = 'mutation' }) => apiCallBegan({
  url,
  method,
  data,
  params,
  organizationScoped: true,
  requestKey,
  onStart: resourceActions[resource].started,
  onSuccess: onSuccess || (resource === 'mutation' ? actions.mutationReceived.type : undefined),
  onError: resourceActions[resource].failed,
})

export const loadSalesDemoSummary = () => request({ url: '/sales-demos/summary', requestKey: 'sales-demo-summary', resource: 'summary', onSuccess: actions.summaryReceived.type })
export const loadSalesDemoSessions = params => request({ url: '/sales-demos/sessions', params, requestKey: 'sales-demo-sessions', resource: 'sessions', onSuccess: actions.sessionsReceived.type })
export const loadSalesDemoTemplates = () => request({ url: '/sales-demos/templates', requestKey: 'sales-demo-templates', resource: 'templates', onSuccess: actions.templatesReceived.type })
export const loadSalesDemoCampaigns = () => request({ url: '/sales-demos/campaigns', requestKey: 'sales-demo-campaigns', resource: 'campaigns', onSuccess: actions.campaignsReceived.type })

export const salesDemoRequest = ({ url, method = 'get', data, params, requestKey = 'sales-demo-mutation' }) => request({
  url: `/sales-demos${url}`,
  method,
  data,
  params,
  requestKey,
})

export const salesDemoTelemetry = (metric, durationMs = 0) => apiCallBegan({
  url: '/sales-demos/telemetry',
  method: 'post',
  data: { metric, duration_ms: durationMs },
  organizationScoped: true,
})

const root = state => state.entities.salesDemos
export const salesDemoSelectors = {
  getSummary: state => root(state).summary,
  getSessions: state => root(state).sessions,
  getSessionPagination: state => root(state).sessionPagination,
  getTemplates: state => root(state).templates,
  getPartPresets: state => root(state).partPresets,
  getDefaultPartPresetKey: state => root(state).defaultPartPresetKey,
  getRecipes: state => root(state).recipes,
  getScenarioModules: state => root(state).scenarioModules,
  getCampaigns: state => root(state).campaigns,
  getLoading: state => Object.values(root(state).loadingByResource).some(Boolean),
  getLoadingByResource: state => root(state).loadingByResource,
  getError: state => root(state).error,
}

export default slice.reducer
