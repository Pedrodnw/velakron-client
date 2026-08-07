import { createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../../api'
import { uploadFileToIntent } from '../../fileTransfer'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'

const emptyEntry = () => ({ data: null, loading: false, mutating: false, upload: null, error: null })
const initialState = { production: {}, relationships: {} }
const ensure = (state, scope, id) => {
  const key = String(id)
  if (!state[scope][key]) state[scope][key] = emptyEntry()
  return state[scope][key]
}

const slice = createSlice({
  name: 'confidentiality',
  initialState,
  reducers: {
    requested: (state, action) => {
      const target = ensure(state, action.payload.scope, action.payload.id)
      target.loading = true
      target.error = null
    },
    mutationRequested: (state, action) => {
      const target = ensure(state, action.payload.scope, action.payload.id)
      target.mutating = true
      target.error = null
    },
    received: (state, action) => {
      const { scope, id, data } = action.payload
      const target = ensure(state, scope, id)
      target.data = data
      target.loading = false
      target.mutating = false
      target.upload = null
      target.error = null
    },
    failed: (state, action) => {
      const target = ensure(state, action.payload.scope, action.payload.id)
      target.loading = false
      target.mutating = false
      target.upload = null
      target.error = action.payload.error
    },
    uploadChanged: (state, action) => {
      ensure(state, action.payload.scope, action.payload.id).upload = action.payload.upload
    },
  },
  extraReducers: builder => {
    builder.addCase(organizationContextCleared, () => initialState)
    builder.addCase(organizationSwitchRequested, () => initialState)
  },
})

const { failed, mutationRequested, received, requested, uploadChanged } = slice.actions
const call = options => dispatch => dispatch(apiCallBegan({ organizationScoped: true, ...options }))
const scopeUrl = (scope, id) => scope === 'production'
  ? `/confidentiality/production-records/${id}`
  : `/confidentiality/relationships/${id}`

export const loadProductionConfidentiality = id => async dispatch => {
  dispatch(requested({ scope: 'production', id }))
  const result = await dispatch(call({ url: scopeUrl('production', id), requestKey: `production-confidentiality-${id}` }))
  if (result?.ok) dispatch(received({ scope: 'production', id, data: result.payload.data.confidentiality }))
  else dispatch(failed({ scope: 'production', id, error: result?.error || { message: 'Confidentiality requirements could not be loaded.' } }))
  return result
}

export const configureProductionConfidentiality = (id, data) => async dispatch => {
  dispatch(mutationRequested({ scope: 'production', id }))
  const result = await dispatch(call({ url: scopeUrl('production', id), method: 'patch', data }))
  if (result?.ok) dispatch(received({ scope: 'production', id, data: result.payload.data.confidentiality }))
  else dispatch(failed({ scope: 'production', id, error: result?.error || { message: 'Confidentiality settings could not be saved.' } }))
  return result
}

export const acceptProductionConfidentiality = (id, data) => async dispatch => {
  dispatch(mutationRequested({ scope: 'production', id }))
  const result = await dispatch(call({ url: `${scopeUrl('production', id)}/accept`, method: 'post', data }))
  if (result?.ok) dispatch(received({ scope: 'production', id, data: result.payload.data.confidentiality }))
  else dispatch(failed({ scope: 'production', id, error: result?.error || { message: 'The confidentiality requirement could not be signed.' } }))
  return result
}

export const updateProductionConfidentialityRoster = (id, data) => async dispatch => {
  dispatch(mutationRequested({ scope: 'production', id }))
  const result = await dispatch(call({ url: `${scopeUrl('production', id)}/roster`, method: 'patch', data }))
  if (result?.ok) dispatch(received({ scope: 'production', id, data: result.payload.data.confidentiality }))
  else dispatch(failed({ scope: 'production', id, error: result?.error || { message: 'The Restricted roster could not be saved.' } }))
  return result
}

export const loadRelationshipConfidentiality = id => async dispatch => {
  dispatch(requested({ scope: 'relationships', id }))
  const result = await dispatch(call({ url: scopeUrl('relationship', id), requestKey: `relationship-confidentiality-${id}` }))
  if (result?.ok) dispatch(received({ scope: 'relationships', id, data: result.payload.data.confidentiality }))
  else dispatch(failed({ scope: 'relationships', id, error: result?.error || { message: 'Relationship confidentiality could not be loaded.' } }))
  return result
}

export const configureRelationshipConfidentiality = (id, data) => async dispatch => {
  dispatch(mutationRequested({ scope: 'relationships', id }))
  const result = await dispatch(call({ url: scopeUrl('relationship', id), method: 'patch', data }))
  if (result?.ok) dispatch(received({ scope: 'relationships', id, data: result.payload.data.confidentiality }))
  else dispatch(failed({ scope: 'relationships', id, error: result?.error || { message: 'Relationship confidentiality could not be saved.' } }))
  return result
}

export const uploadConfidentialityNda = (scope, id, { file, reason = '' }) => async dispatch => {
  const stateScope = scope === 'production' ? 'production' : 'relationships'
  dispatch(mutationRequested({ scope: stateScope, id }))
  dispatch(uploadChanged({ scope: stateScope, id, upload: { filename: file.name, progress: 0, state: 'preparing' } }))
  const base = `${scopeUrl(scope, id)}/nda`
  const intent = await dispatch(call({
    url: `${base}/intents`,
    method: 'post',
    data: { filename: file.name, mime_type: file.type || 'application/pdf', byte_size: file.size },
  }))
  if (!intent?.ok) {
    dispatch(failed({ scope: stateScope, id, error: intent?.error || { message: 'The NDA upload could not be prepared.' } }))
    return intent
  }
  try {
    dispatch(uploadChanged({ scope: stateScope, id, upload: { filename: file.name, progress: 5, state: 'uploading' } }))
    await uploadFileToIntent({
      file,
      upload: intent.payload.data.upload,
      onProgress: progress => dispatch(uploadChanged({
        scope: stateScope,
        id,
        upload: { filename: file.name, progress: Math.min(90, progress), state: 'uploading' },
      })),
    })
  } catch (error) {
    const result = { ok: false, error: error.response?.data?.error || { message: error.message } }
    dispatch(failed({ scope: stateScope, id, error: result.error }))
    return result
  }
  dispatch(uploadChanged({ scope: stateScope, id, upload: { filename: file.name, progress: 95, state: 'verifying' } }))
  const finalized = await dispatch(call({
    url: `${base}/${intent.payload.data.attachment.id}/finalize`,
    method: 'post',
    data: { reason },
  }))
  if (!finalized?.ok) {
    dispatch(failed({ scope: stateScope, id, error: finalized?.error || { message: 'The NDA PDF could not be verified.' } }))
    return finalized
  }
  dispatch(uploadChanged({ scope: stateScope, id, upload: { filename: file.name, progress: 100, state: 'complete' } }))
  if (scope === 'production') await dispatch(loadProductionConfidentiality(id))
  else await dispatch(loadRelationshipConfidentiality(id))
  return finalized
}

const stateFor = state => state.entities.confidentiality
const EMPTY = Object.freeze(emptyEntry())
export const confidentialitySelectors = {
  getProduction: id => state => stateFor(state).production[String(id)] || EMPTY,
  getRelationship: id => state => stateFor(state).relationships[String(id)] || EMPTY,
}

export default slice.reducer
