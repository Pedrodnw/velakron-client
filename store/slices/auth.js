import { createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../api'

const initialState = {
  user: null,
  initialized: false,
  status: 'idle',
  error: null,
}

const responseUser = payload => payload?.data?.user || null

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionRequested: state => {
      state.status = 'loading'
      state.error = null
    },
    sessionReceived: (state, action) => {
      state.user = responseUser(action.payload)
      state.initialized = true
      state.status = state.user ? 'authenticated' : 'anonymous'
      state.error = null
    },
    sessionFailed: (state, action) => {
      state.user = null
      state.initialized = true
      state.status = 'anonymous'
      state.error = action.payload?.error || action.payload
    },
    authRequestStarted: state => {
      state.status = 'loading'
      state.error = null
    },
    authRequestSucceeded: (state, action) => {
      state.user = responseUser(action.payload)
      state.initialized = true
      state.status = state.user ? 'authenticated' : 'anonymous'
      state.error = null
    },
    authRequestFailed: (state, action) => {
      state.status = state.user ? 'authenticated' : 'anonymous'
      state.error = action.payload?.error || action.payload
    },
    signedOut: state => {
      state.user = null
      state.initialized = true
      state.status = 'anonymous'
      state.error = null
    },
  },
})

const {
  authRequestFailed,
  authRequestStarted,
  authRequestSucceeded,
  sessionFailed,
  sessionReceived,
  sessionRequested,
  signedOut,
} = slice.actions

const authenticatedRequest = (url, method, data) => apiCallBegan({
  url,
  method,
  data,
  onStart: authRequestStarted.type,
  onSuccess: authRequestSucceeded.type,
  onError: authRequestFailed.type,
})

export const loadSession = headers => apiCallBegan({
  url: '/auth/session',
  headers,
  onStart: sessionRequested.type,
  onSuccess: sessionReceived.type,
  onError: sessionFailed.type,
})

export const registerAccount = data => authenticatedRequest('/register', 'post', data)
export const loginAccount = data => authenticatedRequest('/auth/login', 'post', data)
export const startTradeShowDemo = data => authenticatedRequest('/trade-show/leads', 'post', data)
export const updateProfile = data => authenticatedRequest('/user/profile', 'patch', data)
export const updateEmail = data => authenticatedRequest('/user/email', 'patch', data)
export const updatePassword = data => authenticatedRequest('/user/password', 'patch', data)

export const logoutAccount = () => apiCallBegan({
  url: '/auth/logout',
  method: 'post',
  onStart: authRequestStarted.type,
  onSuccess: signedOut.type,
  onError: authRequestFailed.type,
})

export const getAuthUser = state => state.auth.user
export const getAuthInitialized = state => state.auth.initialized
export const getAuthStatus = state => state.auth.status

export default slice.reducer
