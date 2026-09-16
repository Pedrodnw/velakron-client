import { createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../../api'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'

const initialState = {
  current: null,
  currentLoading: false,
  currentError: null,
  partners: [],
  adminLoading: false,
  adminError: null,
  detail: null,
  detailLoading: false,
  detailError: null,
}

const slice = createSlice({
  name: 'salesPartners',
  initialState,
  reducers: {
    currentRequested: state => { state.currentLoading = true; state.currentError = null },
    currentReceived: (state, action) => { state.current = action.payload?.data || null; state.currentLoading = false; state.currentError = null },
    currentFailed: (state, action) => { state.currentLoading = false; state.currentError = action.payload?.error || action.payload },
    adminRequested: state => { state.adminLoading = true; state.adminError = null },
    adminReceived: (state, action) => { state.partners = action.payload?.data?.sales_partners || []; state.adminLoading = false; state.adminError = null },
    adminFailed: (state, action) => { state.adminLoading = false; state.adminError = action.payload?.error || action.payload },
    detailRequested: state => { state.detailLoading = true; state.detailError = null },
    detailReceived: (state, action) => { state.detail = action.payload?.data || null; state.detailLoading = false; state.detailError = null },
    detailFailed: (state, action) => { state.detailLoading = false; state.detailError = action.payload?.error || action.payload },
  },
  extraReducers: builder => {
    builder.addCase(organizationContextCleared, () => initialState)
    builder.addCase(organizationSwitchRequested, () => initialState)
  },
})

const actions = slice.actions
const supportHeaders = reason => ({ 'X-Velakron-Support-Reason': reason })
const scoped = options => apiCallBegan({ organizationScoped: true, ...options })

export const loadSalesPartnerPortal = () => scoped({
  url: '/sales-partners/current',
  onStart: actions.currentRequested.type,
  onSuccess: actions.currentReceived.type,
  onError: actions.currentFailed.type,
  requestKey: 'sales-partner-current',
})

export const signSalesPartnerAgreement = data => scoped({ url: '/sales-partners/current/agreement', method: 'post', data })
export const updateSalesPartnerPayout = data => scoped({ url: '/sales-partners/current/payout', method: 'patch', data })
export const addSalesPartnerMember = data => scoped({ url: '/sales-partners/current/members', method: 'post', data })
export const updateSalesPartnerMember = (id, data) => scoped({ url: `/sales-partners/current/members/${id}`, method: 'patch', data })
export const createSalesPartnerReferralLink = data => scoped({ url: '/sales-partners/current/referral-links', method: 'post', data })
export const updateSalesPartnerReferralLink = (id, data) => scoped({ url: `/sales-partners/current/referral-links/${id}`, method: 'patch', data })

export const loadSalesPartnersAdmin = reason => scoped({
  url: '/sales-partners/admin',
  headers: supportHeaders(reason),
  onStart: actions.adminRequested.type,
  onSuccess: actions.adminReceived.type,
  onError: actions.adminFailed.type,
  requestKey: 'sales-partners-admin',
})

export const enrollSalesPartner = (data, reason) => scoped({ url: '/sales-partners/admin/enroll', method: 'post', data, headers: supportHeaders(reason) })
export const loadSalesPartnerAdminDetail = (id, reason) => scoped({
  url: `/sales-partners/admin/${id}`,
  headers: supportHeaders(reason),
  onStart: actions.detailRequested.type,
  onSuccess: actions.detailReceived.type,
  onError: actions.detailFailed.type,
  requestKey: `sales-partner-admin-${id}`,
})
export const updateSalesPartnerAdmin = (id, data, reason) => scoped({ url: `/sales-partners/admin/${id}`, method: 'patch', data, headers: supportHeaders(reason) })
export const generateSalesPartnerStatement = (id, periodKey, reason) => scoped({ url: `/sales-partners/admin/${id}/statements`, method: 'post', data: { period_key: periodKey }, headers: supportHeaders(reason) })
export const finalizeSalesPartnerStatement = (id, statementId, reason) => scoped({ url: `/sales-partners/admin/${id}/statements/${statementId}/finalize`, method: 'post', headers: supportHeaders(reason) })
export const markSalesPartnerStatementPaid = (id, statementId, data, reason) => scoped({ url: `/sales-partners/admin/${id}/statements/${statementId}/paid`, method: 'post', data, headers: supportHeaders(reason) })

const root = state => state.entities.salesPartners
export const salesPartnerSelectors = {
  getCurrent: state => root(state).current,
  getCurrentLoading: state => root(state).currentLoading,
  getCurrentError: state => root(state).currentError,
  getPartners: state => root(state).partners,
  getAdminLoading: state => root(state).adminLoading,
  getAdminError: state => root(state).adminError,
  getDetail: state => root(state).detail,
  getDetailLoading: state => root(state).detailLoading,
  getDetailError: state => root(state).detailError,
}

export default slice.reducer
