import { createSelector, createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../../api'
import { openDownloadTarget, uploadFileToIntent } from '../../fileTransfer'
import { uploadMimeForFile } from '../../modelFiles'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'

const initialState = {
  ids: [],
  byId: {},
  detailsById: {},
  revisionDetailsById: {},
  collaborationByPart: {},
  collaborationDetailsById: {},
  historyByPart: {},
  actionSummary: null,
  actionItems: [],
  actionItemsLoading: false,
  loading: false,
  detailLoading: false,
  mutating: false,
  upload: null,
  error: null,
  pagination: null,
}

const slice = createSlice({
  name: 'parts',
  initialState,
  reducers: {
    listRequested: state => { state.loading = true; state.error = null },
    listReceived: (state, action) => {
      const parts = action.payload?.data?.parts || []
      state.ids = parts.map(part => String(part.id || part._id))
      for (const part of parts) state.byId[String(part.id || part._id)] = part
      state.pagination = action.payload?.meta || null
      state.loading = false
    },
    detailRequested: state => { state.detailLoading = true; state.error = null },
    partReceived: (state, action) => {
      const data = action.payload?.data || action.payload
      if (!data?.part) return
      const id = String(data.part.id || data.part._id)
      state.byId[id] = data.part
      state.detailsById[id] = data
      state.detailLoading = false
      state.mutating = false
      state.error = null
    },
    revisionReceived: (state, action) => {
      const data = action.payload?.data || action.payload
      if (!data?.revision) return
      state.revisionDetailsById[String(data.revision.id || data.revision._id)] = data
      state.detailLoading = false
      state.mutating = false
      state.error = null
    },
    collaborationListReceived: (state, action) => {
      const { partId, payload } = action.payload
      state.collaborationByPart[String(partId)] = payload?.data?.items || []
    },
    collaborationDetailReceived: (state, action) => {
      const data = action.payload?.data || action.payload
      if (data?.item) state.collaborationDetailsById[String(data.item.id || data.item._id)] = data
      state.mutating = false
      state.error = null
    },
    historyReceived: (state, action) => {
      const { partId, payload } = action.payload
      state.historyByPart[String(partId)] = payload?.data?.events || []
    },
    actionSummaryReceived: (state, action) => {
      state.actionSummary = action.payload?.data || action.payload || null
    },
    actionItemsRequested: state => {
      state.actionItemsLoading = true
      state.error = null
    },
    actionItemsReceived: (state, action) => {
      state.actionItems = action.payload?.data?.items || []
      state.actionItemsLoading = false
    },
    mutationRequested: state => { state.mutating = true; state.error = null },
    uploadChanged: (state, action) => { state.upload = action.payload },
    requestFailed: (state, action) => {
      state.loading = false
      state.detailLoading = false
      state.mutating = false
      state.actionItemsLoading = false
      state.upload = null
      state.error = action.payload?.error || action.payload
    },
  },
  extraReducers: builder => {
    builder.addCase(organizationContextCleared, () => initialState)
    builder.addCase(organizationSwitchRequested, () => initialState)
  },
})

const {
  collaborationDetailReceived,
  collaborationListReceived,
  actionItemsReceived,
  actionItemsRequested,
  actionSummaryReceived,
  detailRequested,
  historyReceived,
  listReceived,
  listRequested,
  mutationRequested,
  partReceived,
  requestFailed,
  revisionReceived,
  uploadChanged,
} = slice.actions

const call = options => apiCallBegan({ organizationScoped: true, ...options })

export const loadParts = (params = {}) => call({
  url: '/parts', params, onStart: listRequested.type, onSuccess: listReceived.type,
  onError: requestFailed.type, requestKey: 'parts-list',
})

export const loadPartActionSummary = () => call({
  url: '/parts/actions/summary', onSuccess: actionSummaryReceived.type,
  onError: requestFailed.type, requestKey: 'parts-action-summary',
})

export const loadPartActionItems = () => call({
  url: '/part-collaboration',
  params: { state: 'active', needs_action: true, page_size: 100 },
  onStart: actionItemsRequested.type,
  onSuccess: actionItemsReceived.type,
  onError: requestFailed.type,
  requestKey: 'parts-action-items',
})

export const loadPart = id => call({
  url: `/parts/${id}`, onStart: detailRequested.type, onSuccess: partReceived.type,
  onError: requestFailed.type, requestKey: `part-${id}`,
})

export const loadPartRevision = (partId, revisionId) => call({
  url: `/parts/${partId}/revisions/${revisionId}`, onStart: detailRequested.type,
  onSuccess: revisionReceived.type, onError: requestFailed.type,
  requestKey: `part-revision-${revisionId}`,
})

export const loadPartCollaboration = (partId, params = {}) => async dispatch => {
  const result = await dispatch(call({ url: '/part-collaboration', params: { part_id: partId, page_size: 100, ...params }, requestKey: `part-collaboration-${partId}` }))
  if (result?.ok) dispatch(collaborationListReceived({ partId, payload: result.payload }))
  else if (!result?.cancelled) dispatch(requestFailed(result?.error || { message: 'Collaboration items could not be loaded.' }))
  return result
}

export const loadPartCollaborationItem = id => call({
  url: `/part-collaboration/${id}`, onStart: mutationRequested.type,
  onSuccess: collaborationDetailReceived.type, onError: requestFailed.type,
  requestKey: `part-collaboration-item-${id}`,
})

export const loadPartHistory = id => async dispatch => {
  const result = await dispatch(call({ url: `/parts/${id}/history`, params: { page_size: 100 }, requestKey: `part-history-${id}` }))
  if (result?.ok) dispatch(historyReceived({ partId: id, payload: result.payload }))
  else if (!result?.cancelled) dispatch(requestFailed(result?.error || { message: 'Part history could not be loaded.' }))
  return result
}

export const exportPartDecisionRegister = (id, revisionId = '') => async dispatch => {
  const result = await dispatch(call({
    url: `/parts/${id}/export`,
    params: revisionId ? { revision_id: revisionId } : {},
    requestKey: `part-export-${id}-${revisionId}`,
  }))
  if (!result?.ok || typeof window === 'undefined') return result
  const report = result.payload?.data?.export
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const target = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = target
  anchor.download = `${String(report?.part?.part_number || 'part').replace(/[^a-z0-9._-]+/gi, '-')}-${report?.revision?.revision || 'revision'}-decision-register.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.URL.revokeObjectURL(target)
  return result
}

const mutate = options => call({
  method: 'post', onStart: mutationRequested.type, onError: requestFailed.type, ...options,
})

export const createPart = data => mutate({ url: '/parts', data })
export const updatePart = (id, data) => mutate({ url: `/parts/${id}`, method: 'patch', data })
export const archivePart = (id, reason, version) => mutate({ url: `/parts/${id}/archive`, data: { reason, version } })
export const restorePart = (id, version) => mutate({ url: `/parts/${id}/restore`, data: { version } })
export const createPartRevision = (partId, data) => mutate({ url: `/parts/${partId}/revisions`, data })
export const clonePartRevision = (partId, revisionId, data) => mutate({ url: `/parts/${partId}/revisions/${revisionId}/clone`, data })
export const updatePartRevision = (partId, revisionId, data) => mutate({ url: `/parts/${partId}/revisions/${revisionId}`, method: 'patch', data })
export const validatePartRevision = (partId, revisionId) => call({
  url: `/parts/${partId}/revisions/${revisionId}/validate`, method: 'post', data: {},
  requestKey: `part-revision-validation-${revisionId}`,
})
export const releasePartRevision = (partId, revisionId, version) => mutate({ url: `/parts/${partId}/revisions/${revisionId}/release`, data: { version } })
export const withdrawPartRevision = (partId, revisionId, reason, version) => mutate({ url: `/parts/${partId}/revisions/${revisionId}/withdraw`, data: { reason, version } })
export const addPartRequirement = (partId, revisionId, data) => mutate({ url: `/parts/${partId}/revisions/${revisionId}/requirements`, data })
export const updatePartRequirement = (partId, revisionId, requirementId, data) => (dispatch, getState) => {
  const requirements = getState().entities.parts.revisionDetailsById[String(revisionId)]?.requirements || []
  const current = requirements.find(item => String(item.id || item._id) === String(requirementId))
  return dispatch(mutate({
    url: `/parts/${partId}/revisions/${revisionId}/requirements/${requirementId}`,
    method: 'patch',
    data: { ...data, version: current?.version },
  }))
}
export const removePartRequirement = (partId, revisionId, requirementId) => mutate({ url: `/parts/${partId}/revisions/${revisionId}/requirements/${requirementId}`, method: 'delete' })
export const sharePart = (partId, data) => mutate({ url: `/parts/${partId}/shares`, data })
export const updatePartShare = (partId, shareId, data) => mutate({ url: `/parts/${partId}/shares/${shareId}`, method: 'patch', data })
export const endPartShare = (partId, shareId, data) => mutate({ url: `/parts/${partId}/shares/${shareId}/end`, data })
export const createVisualAnchor = (partId, revisionId, data) => mutate({ url: `/parts/${partId}/revisions/${revisionId}/anchors`, data })
export const carryPartVisualAnchor = (partId, sourceRevisionId, anchorId, data) => mutate({ url: `/parts/${partId}/revisions/${sourceRevisionId}/anchors/${anchorId}/carry-forward`, data })
export const createPartCollaboration = data => mutate({ url: '/part-collaboration', data })
export const updatePartCollaboration = (id, data) => mutate({ url: `/part-collaboration/${id}`, method: 'patch', data })
export const archivePartCollaboration = (id, data) => mutate({ url: `/part-collaboration/${id}/archive`, data })
export const postPartCollaborationMessage = (id, body) => mutate({ url: `/part-collaboration/${id}/messages`, data: { body } })
export const applyPartCollaborationAction = (id, data) => mutate({
  url: `/part-collaboration/${id}/actions`,
  data: {
    ...data,
    idempotency_key: data.idempotency_key || `part-action:${id}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
  },
})
export const promotePartCollaboration = (id, data) => mutate({ url: `/part-collaboration/${id}/promote`, data })
export const startPartReview = id => mutate({ url: `/part-reviews/${id}/start`, data: {} })
export const requestPartReviewChanges = (id, note) => mutate({ url: `/part-reviews/${id}/request-changes`, data: { note } })
export const acknowledgePartRequirement = (reviewId, requirementId) => mutate({ url: `/part-reviews/${reviewId}/requirements/${requirementId}/acknowledge`, data: {} })
export const acknowledgePartRevision = (reviewId, note = '') => mutate({ url: `/part-reviews/${reviewId}/acknowledge`, data: { note } })

const upload = ({ intentUrl, finalizeUrl, file, intentData }) => async dispatch => {
  dispatch(mutationRequested())
  dispatch(uploadChanged({ filename: file.name, progress: 0, state: 'preparing' }))
  const intent = await dispatch(call({ url: intentUrl, method: 'post', data: { filename: file.name, mime_type: uploadMimeForFile(file), byte_size: file.size, ...intentData } }))
  if (!intent?.ok) { dispatch(requestFailed(intent?.error || { message: 'The upload could not be prepared.' })); return intent }
  try {
    dispatch(uploadChanged({ filename: file.name, progress: 5, state: 'uploading' }))
    await uploadFileToIntent({ file, upload: intent.payload.data.upload, onProgress: progress => dispatch(uploadChanged({ filename: file.name, progress: Math.round(progress * 0.9), state: 'uploading' })) })
    dispatch(uploadChanged({ filename: file.name, progress: 95, state: 'verifying' }))
  } catch (error) {
    const failed = { ok: false, error: error.response?.data?.error || { message: error.message } }
    dispatch(requestFailed(failed.error))
    return failed
  }
  const finalized = await dispatch(call({ url: finalizeUrl(intent.payload.data), method: 'post', data: {} }))
  if (!finalized?.ok) { dispatch(requestFailed(finalized?.error || { message: 'The upload could not be verified.' })); return finalized }
  dispatch(uploadChanged({ filename: file.name, progress: 100, state: finalized.payload?.data?.attachment?.state === 'available' ? 'complete' : 'security_check' }))
  return finalized
}

export const uploadPartAsset = (partId, revisionId, { file, role, label = '', isPrimary = false, itar = {} }) => upload({
  intentUrl: `/parts/${partId}/revisions/${revisionId}/assets/intents`,
  finalizeUrl: data => `/parts/${partId}/revisions/${revisionId}/assets/${data.asset.id}/finalize`,
  file,
  intentData: { role, label, is_primary: isPrimary, ...itar },
})

export const uploadPartCollaborationAttachment = (itemId, { file, caption = '', itar = {} }) => upload({
  intentUrl: `/part-collaboration/${itemId}/attachments/intents`,
  finalizeUrl: data => `/part-collaboration/${itemId}/attachments/${data.attachment.id}/finalize`,
  file,
  intentData: { caption, ...itar },
})

export const requestPartAssetView = (partId, revisionId, assetId, attestation = {}) => call({ url: `/parts/${partId}/revisions/${revisionId}/assets/${assetId}/view-intent`, method: 'post', data: attestation })
export const requestPartAssetDownload = (partId, revisionId, assetId, attestation = {}) => async dispatch => {
  const result = await dispatch(call({ url: `/parts/${partId}/revisions/${revisionId}/assets/${assetId}/download-intent`, method: 'post', data: attestation }))
  if (result?.ok) openDownloadTarget(result.payload.data.download.target)
  return result
}
export const requestCollaborationAttachmentDownload = (itemId, attachmentId, attestation = {}) => async dispatch => {
  const result = await dispatch(call({ url: `/part-collaboration/${itemId}/attachments/${attachmentId}/download-intent`, method: 'post', data: attestation }))
  if (result?.ok) openDownloadTarget(result.payload.data.download.target)
  return result
}

const stateFor = state => state.entities.parts
const EMPTY_LIST = Object.freeze([])
export const partSelectors = {
  getParts: createSelector([state => stateFor(state).ids, state => stateFor(state).byId], (ids, byId) => ids.map(id => byId[id])),
  getPartById: id => state => stateFor(state).byId[String(id)] || null,
  getDetailById: id => state => stateFor(state).detailsById[String(id)] || null,
  getRevisionDetail: id => state => stateFor(state).revisionDetailsById[String(id)] || null,
  getCollaborationByPart: id => state => stateFor(state).collaborationByPart[String(id)] || EMPTY_LIST,
  getCollaborationDetail: id => state => stateFor(state).collaborationDetailsById[String(id)] || null,
  getHistoryByPart: id => state => stateFor(state).historyByPart[String(id)] || EMPTY_LIST,
  getActionSummary: state => stateFor(state).actionSummary,
  getActionItems: state => stateFor(state).actionItems,
  getActionItemsLoading: state => stateFor(state).actionItemsLoading,
  getLoading: state => stateFor(state).loading,
  getDetailLoading: state => stateFor(state).detailLoading,
  getMutating: state => stateFor(state).mutating,
  getUpload: state => stateFor(state).upload,
  getError: state => stateFor(state).error,
  getPagination: state => stateFor(state).pagination,
}

export default slice.reducer
