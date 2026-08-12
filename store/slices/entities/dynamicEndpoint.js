import { createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../../api'
import { uploadFileToIntent } from '../../fileTransfer'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'

const initialState = {
  configuration: null,
  loading: false,
  mutating: false,
  upload: null,
  error: null,
  mutationError: null,
}

const slice = createSlice({
  name: 'dynamicEndpoint',
  initialState,
  reducers: {
    configurationRequested: state => {
      state.loading = true
      state.error = null
    },
    configurationReceived: (state, action) => {
      state.configuration = action.payload?.data || null
      state.loading = false
      state.mutating = false
      state.upload = null
      state.error = null
      state.mutationError = null
    },
    configurationFailed: (state, action) => {
      state.loading = false
      state.error = action.payload?.error || action.payload
    },
    mutationRequested: state => {
      state.mutating = true
      state.mutationError = null
    },
    uploadChanged: (state, action) => { state.upload = action.payload },
    mutationFailed: (state, action) => {
      state.mutating = false
      state.upload = null
      state.mutationError = action.payload?.error || action.payload
    },
  },
  extraReducers: builder => {
    builder.addCase(organizationContextCleared, () => initialState)
    builder.addCase(organizationSwitchRequested, () => initialState)
  },
})

const actions = slice.actions
const scopedCall = options => apiCallBegan({ organizationScoped: true, ...options })

export const dynamicEndpointMimeForFile = file => {
  const extension = String(file?.name || '').trim().toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
  const byExtension = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    pdf: 'application/pdf',
    png: 'image/png',
    txt: 'text/plain',
    webp: 'image/webp',
  }
  return byExtension[extension] || String(file?.type || '').toLowerCase()
}

export const loadDynamicEndpoint = () => scopedCall({
  url: '/dynamic-endpoint/admin',
  onStart: actions.configurationRequested.type,
  onSuccess: actions.configurationReceived.type,
  onError: actions.configurationFailed.type,
  requestKey: 'dynamic-endpoint-configuration',
})

export const publishDynamicEndpointRedirect = url => scopedCall({
  url: '/dynamic-endpoint/admin/redirect',
  method: 'put',
  data: { url },
  onStart: actions.mutationRequested.type,
  onSuccess: actions.configurationReceived.type,
  onError: actions.mutationFailed.type,
  requestKey: 'dynamic-endpoint-mutation',
})

export const publishDynamicEndpointFile = file => async dispatch => {
  dispatch(actions.mutationRequested())
  dispatch(actions.uploadChanged({ filename: file.name, progress: 0, state: 'preparing' }))
  const intent = await dispatch(scopedCall({
    url: '/dynamic-endpoint/admin/files/intents',
    method: 'post',
    data: {
      filename: file.name,
      mime_type: dynamicEndpointMimeForFile(file),
      byte_size: file.size,
    },
  }))
  if (!intent?.ok) {
    dispatch(actions.mutationFailed(intent?.error || { message: 'The upload could not be prepared.' }))
    return intent
  }

  try {
    dispatch(actions.uploadChanged({ filename: file.name, progress: 5, state: 'uploading' }))
    await uploadFileToIntent({
      file,
      upload: intent.payload.data.upload,
      onProgress: progress => dispatch(actions.uploadChanged({
        filename: file.name,
        progress: Math.round(progress * 0.9),
        state: 'uploading',
      })),
    })
    dispatch(actions.uploadChanged({ filename: file.name, progress: 95, state: 'verifying' }))
  } catch (error) {
    const failed = { ok: false, error: error.response?.data?.error || { message: error.message } }
    dispatch(actions.mutationFailed(failed.error))
    return failed
  }

  const assetId = intent.payload.data.asset.id
  const activated = await dispatch(scopedCall({
    url: `/dynamic-endpoint/admin/files/${assetId}/activate`,
    method: 'post',
    data: {},
  }))
  if (!activated?.ok) {
    dispatch(actions.mutationFailed(activated?.error || { message: 'The file could not be verified.' }))
    return activated
  }
  dispatch(actions.uploadChanged({ filename: file.name, progress: 100, state: 'complete' }))
  dispatch(actions.configurationReceived(activated.payload))
  return activated
}

const root = state => state.entities.dynamicEndpoint
export const dynamicEndpointSelectors = {
  getConfiguration: state => root(state).configuration,
  getLoading: state => root(state).loading,
  getMutating: state => root(state).mutating,
  getUpload: state => root(state).upload,
  getError: state => root(state).error,
  getMutationError: state => root(state).mutationError,
}

export default slice.reducer
