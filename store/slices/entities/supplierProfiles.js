import { createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../../api'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'

const initialState = {
  current: null,
  progress: null,
  vocabularies: {},
  vocabularyVersion: null,
  connected: [],
  reviewQueue: [],
  detail: null,
  loading: false,
  error: null,
}

const data = action => action.payload?.data || {}

const slice = createSlice({
  name: 'supplierProfiles',
  initialState,
  reducers: {
    requestStarted: state => { state.loading = true; state.error = null },
    requestFailed: (state, action) => { state.loading = false; state.error = action.payload?.error || action.payload },
    currentReceived: (state, action) => {
      state.current = data(action).profile || null
      state.progress = data(action).progress || state.progress
      state.loading = false
      state.error = null
    },
    vocabulariesReceived: (state, action) => {
      state.vocabularies = data(action).vocabularies || {}
      state.vocabularyVersion = data(action).version || null
    },
    connectedReceived: (state, action) => { state.connected = data(action).suppliers || []; state.loading = false; state.error = null },
    reviewQueueReceived: (state, action) => { state.reviewQueue = data(action).profiles || []; state.loading = false; state.error = null },
    detailReceived: (state, action) => { state.detail = data(action); state.loading = false; state.error = null },
  },
  extraReducers: builder => {
    builder.addCase(organizationContextCleared, () => initialState)
    builder.addCase(organizationSwitchRequested, () => initialState)
  },
})

const { requestStarted, requestFailed, currentReceived, vocabulariesReceived, connectedReceived, reviewQueueReceived, detailReceived } = slice.actions
const request = (url, options = {}) => apiCallBegan({
  url,
  organizationScoped: true,
  onStart: requestStarted.type,
  onError: requestFailed.type,
  ...options,
})

export const loadSupplierVocabularies = () => request('/supplier-profiles/vocabularies', { onSuccess: vocabulariesReceived.type, requestKey: 'supplier-vocabularies' })
export const loadCurrentSupplierProfile = () => request('/supplier-profiles/current', { onSuccess: currentReceived.type, requestKey: 'supplier-profile-current' })
export const initializeSupplierProfile = () => request('/supplier-profiles/current', { method: 'post', onSuccess: currentReceived.type, requestKey: 'supplier-profile-write' })
export const updateCurrentSupplierProfile = payload => request('/supplier-profiles/current', { method: 'patch', data: payload, onSuccess: currentReceived.type, requestKey: 'supplier-profile-write' })
export const attestSupplierProfile = version => request('/supplier-profiles/current/attest', { method: 'post', data: { accepted: true, version }, onSuccess: currentReceived.type, requestKey: 'supplier-profile-write' })
export const submitSupplierProfile = version => request('/supplier-profiles/current/submit', { method: 'post', data: { version }, onSuccess: currentReceived.type, requestKey: 'supplier-profile-write' })
export const loadConnectedSuppliers = () => request('/supplier-profiles/connected', { onSuccess: connectedReceived.type, requestKey: 'connected-suppliers' })
export const loadSupplierProfileDetail = (supplierOrganizationId, supportReason = '') => request(`/supplier-profiles/${supplierOrganizationId}`, {
  headers: supportReason ? { 'x-velakron-support-reason': supportReason } : undefined,
  onSuccess: detailReceived.type,
  requestKey: 'supplier-profile-detail',
})
export const loadSupplierReviewQueue = supportReason => request('/supplier-profiles/review-queue', {
  headers: { 'x-velakron-support-reason': supportReason },
  onSuccess: reviewQueueReceived.type,
  requestKey: 'supplier-review-queue',
})
export const reviewSupplierProfile = (supplierOrganizationId, payload, supportReason) => request(`/supplier-profiles/${supplierOrganizationId}/review`, {
  method: 'patch',
  data: payload,
  headers: { 'x-velakron-support-reason': supportReason },
  requestKey: 'supplier-review-write',
})

export const supplierProfileSelectors = {
  getState: state => state.entities.supplierProfiles,
  getCurrent: state => state.entities.supplierProfiles.current,
  getProgress: state => state.entities.supplierProfiles.progress,
  getVocabularies: state => state.entities.supplierProfiles.vocabularies,
  getConnected: state => state.entities.supplierProfiles.connected,
  getReviewQueue: state => state.entities.supplierProfiles.reviewQueue,
  getDetail: state => state.entities.supplierProfiles.detail,
  getLoading: state => state.entities.supplierProfiles.loading,
  getError: state => state.entities.supplierProfiles.error,
}

export default slice.reducer
