import { createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../api'

const initialState = { status: 'idle', error: null, response: null }

const slice = createSlice({
  name: 'identity',
  initialState,
  reducers: {
    identityRequested: state => {
      state.status = 'loading'
      state.error = null
      state.response = null
    },
    identityReceived: (state, action) => {
      state.status = 'success'
      state.error = null
      state.response = action.payload?.data || null
    },
    identityFailed: (state, action) => {
      state.status = 'error'
      state.error = action.payload?.error || action.payload
      state.response = null
    },
    identityReset: () => initialState,
  },
})

const { identityFailed, identityReceived, identityRequested } = slice.actions
export const { identityReset } = slice.actions

const request = ({ url, method = 'get', data, requestKey }) => apiCallBegan({
  url,
  method,
  data,
  requestKey,
  onStart: identityRequested.type,
  onSuccess: identityReceived.type,
  onError: identityFailed.type,
})

export const requestPasswordReset = email => request({
  url: '/identity/password/forgot', method: 'post', data: { email }, requestKey: 'password-forgot',
})
export const previewPasswordReset = token => request({
  url: `/identity/password/reset/${encodeURIComponent(token)}`, requestKey: 'password-reset-preview',
})
export const resetPassword = (token, data) => request({
  url: `/identity/password/reset/${encodeURIComponent(token)}`, method: 'post', data, requestKey: 'password-reset',
})
export const previewInvitation = token => request({
  url: `/identity/invitations/${encodeURIComponent(token)}`, requestKey: 'invitation-preview',
})
export const loadPlatformTerms = () => request({
  url: '/identity/platform-terms/current', requestKey: 'platform-terms-current',
})
export const acceptInvitation = (token, data) => request({
  url: `/identity/invitations/${encodeURIComponent(token)}/accept`, method: 'post', data, requestKey: 'invitation-accept',
})
export const requestVerification = email => request({
  url: '/identity/verification/request', method: 'post', data: { email }, requestKey: 'verification-request',
})
export const previewVerification = token => request({
  url: `/identity/verification/${encodeURIComponent(token)}`, requestKey: 'verification-preview',
})
export const verifyEmail = token => request({
  url: `/identity/verification/${encodeURIComponent(token)}`, method: 'post', requestKey: 'verification-complete',
})
export const previewEmailChange = token => request({
  url: `/identity/email-change/${encodeURIComponent(token)}`, requestKey: 'email-change-preview',
})
export const confirmEmailChange = token => request({
  url: `/identity/email-change/${encodeURIComponent(token)}`, method: 'post', requestKey: 'email-change-confirm',
})
export const loadSessions = () => request({ url: '/auth/sessions', requestKey: 'session-list' })
export const revokeSession = key => request({
  url: `/auth/sessions/${encodeURIComponent(key)}`, method: 'delete', requestKey: `session-revoke-${key}`,
})
export const revokeOtherSessions = () => request({
  url: '/auth/sessions', method: 'delete', requestKey: 'sessions-revoke-all',
})
export const loadSecurityEvents = () => request({ url: '/user/security-events', requestKey: 'security-events' })
export const consumeMagicLink = token => request({
  url: `/identity/magic-link/${encodeURIComponent(token)}`, method: 'post', requestKey: 'magic-link-consume',
})
export const loadDevelopmentOutbox = () => request({
  url: '/development/outbox', requestKey: 'development-outbox',
})

export const getIdentityStatus = state => state.identity.status
export const getIdentityError = state => state.identity.error
export const getIdentityResponse = state => state.identity.response

export default slice.reducer
