import { createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../../api'
import { openDownloadTarget, uploadFileToIntent } from '../../fileTransfer'
import { uploadMimeForFile } from '../../modelFiles'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'

const emptyRecord = () => ({
  timeline: [],
  notes: [],
  attachments: [],
  attention: [],
  health: 'unassessed',
  highestSeverity: null,
  timelinePage: null,
  loading: false,
  mutating: false,
  upload: null,
  error: null,
})
const EMPTY_RECORD = Object.freeze(emptyRecord())

const initialState = { byRecord: {}, summary: null, summaryLoading: false, summaryError: null }
const ensureRecord = (state, id) => {
  const key = String(id)
  if (!state.byRecord[key]) state.byRecord[key] = emptyRecord()
  return state.byRecord[key]
}

const slice = createSlice({
  name: 'productionCollaboration',
  initialState,
  reducers: {
    recordRequested: (state, action) => {
      const target = ensureRecord(state, action.payload)
      target.loading = true
      target.error = null
    },
    recordReceived: (state, action) => {
      const { id, timeline, notes, attachments, attention } = action.payload
      const target = ensureRecord(state, id)
      if (timeline) {
        target.timeline = timeline.events || []
        target.timelinePage = timeline.page || null
      }
      if (notes) target.notes = notes.notes || []
      if (attachments) target.attachments = attachments.attachments || []
      if (attention) {
        target.attention = attention.conditions || []
        target.health = attention.health || 'unassessed'
        target.highestSeverity = attention.highest_severity || null
      }
      target.loading = false
      target.mutating = false
      target.upload = null
      target.error = null
    },
    recordFailed: (state, action) => {
      const target = ensureRecord(state, action.payload.id)
      target.loading = false
      target.mutating = false
      target.upload = null
      target.error = action.payload.error
    },
    mutationRequested: (state, action) => {
      const target = ensureRecord(state, action.payload)
      target.mutating = true
      target.error = null
    },
    uploadChanged: (state, action) => {
      ensureRecord(state, action.payload.id).upload = action.payload.upload
    },
    summaryRequested: state => {
      state.summaryLoading = true
      state.summaryError = null
    },
    summaryReceived: (state, action) => {
      state.summary = action.payload
      state.summaryLoading = false
      state.summaryError = null
    },
    summaryFailed: (state, action) => {
      state.summaryLoading = false
      state.summaryError = action.payload
    },
  },
  extraReducers: builder => {
    builder.addCase(organizationContextCleared, () => initialState)
    builder.addCase(organizationSwitchRequested, () => initialState)
  },
})

const {
  mutationRequested,
  recordFailed,
  recordReceived,
  recordRequested,
  summaryFailed,
  summaryReceived,
  summaryRequested,
  uploadChanged,
} = slice.actions

const call = options => dispatch => dispatch(apiCallBegan({
  organizationScoped: true,
  ...options,
}))

export const loadProductionCollaboration = id => async dispatch => {
  dispatch(recordRequested(id))
  const [timeline, notes, attachments, attention] = await Promise.all([
    dispatch(call({ url: `/production-records/${id}/timeline`, params: { limit: 100 }, requestKey: `production-timeline-${id}` })),
    dispatch(call({ url: `/production-records/${id}/notes`, requestKey: `production-notes-${id}` })),
    dispatch(call({ url: `/production-records/${id}/attachments`, requestKey: `production-attachments-${id}` })),
    dispatch(call({ url: `/production-records/${id}/attention`, requestKey: `production-attention-${id}` })),
  ])
  const failed = [timeline, notes, attachments, attention].find(result => !result?.ok)
  if (failed) {
    dispatch(recordFailed({ id, error: failed.error || { message: 'Collaboration details could not be loaded.' } }))
    return failed
  }
  dispatch(recordReceived({
    id,
    timeline: timeline.payload.data,
    notes: notes.payload.data,
    attachments: attachments.payload.data,
    attention: attention.payload.data,
  }))
  return { ok: true }
}

export const loadProductionSummary = (params = {}) => async dispatch => {
  dispatch(summaryRequested())
  const result = await dispatch(call({
    url: '/production-records/summary',
    params,
    requestKey: 'production-summary',
  }))
  if (result?.ok) dispatch(summaryReceived(result.payload.data))
  else if (!result?.cancelled) dispatch(summaryFailed(result?.error || { message: 'Dashboard summary could not be loaded.' }))
  return result
}

const mutate = (id, options) => async dispatch => {
  dispatch(mutationRequested(id))
  const result = await dispatch(call(options))
  if (!result?.ok) {
    dispatch(recordFailed({ id, error: result?.error || { message: 'The update could not be saved.' } }))
    return result
  }
  await dispatch(loadProductionCollaboration(id))
  dispatch(loadProductionSummary())
  return result
}

export const createProductionNote = (id, data) => mutate(id, {
  url: `/production-records/${id}/notes`, method: 'post', data,
})
export const reviseProductionNote = (id, noteId, data) => mutate(id, {
  url: `/production-records/${id}/notes/${noteId}`, method: 'patch', data,
})
export const archiveProductionNote = (id, noteId, reason) => mutate(id, {
  url: `/production-records/${id}/notes/${noteId}/archive`, method: 'post', data: { reason },
})
export const updateProductionForecast = (id, data) => mutate(id, {
  url: `/production-records/${id}/forecast`, method: 'post', data,
})
export const reportProductionAttention = (id, data) => mutate(id, {
  url: `/production-records/${id}/attention`, method: 'post', data,
})
export const acknowledgeProductionAttention = (id, conditionId) => mutate(id, {
  url: `/production-records/${id}/attention/${conditionId}/acknowledge`, method: 'post', data: {},
})
export const resolveProductionAttention = (id, conditionId, reason) => mutate(id, {
  url: `/production-records/${id}/attention/${conditionId}/resolve`, method: 'post', data: { reason },
})
export const archiveProductionAttachment = (id, attachmentId, reason) => mutate(id, {
  url: `/production-records/${id}/attachments/${attachmentId}/archive`, method: 'post', data: { reason },
})

export const uploadProductionAttachment = (id, {
  file,
  category,
  visibility,
  caption = '',
  regulated_data_acknowledged: regulatedDataAcknowledged,
}) => async dispatch => {
  dispatch(mutationRequested(id))
  dispatch(uploadChanged({ id, upload: { filename: file.name, progress: 0, state: 'preparing' } }))
  const intent = await dispatch(call({
    url: `/production-records/${id}/attachments/intents`,
    method: 'post',
    data: {
      filename: file.name,
      mime_type: uploadMimeForFile(file),
      byte_size: file.size,
      category,
      visibility,
      caption,
      regulated_data_acknowledged: regulatedDataAcknowledged === true,
    },
  }))
  if (!intent?.ok) {
    dispatch(recordFailed({ id, error: intent?.error || { message: 'The upload could not be prepared.' } }))
    return intent
  }
  const upload = intent.payload.data.upload
  try {
    dispatch(uploadChanged({ id, upload: { filename: file.name, progress: 5, state: 'uploading' } }))
    await uploadFileToIntent({
      file,
      upload,
      onProgress: progress => {
        dispatch(uploadChanged({ id, upload: { filename: file.name, progress: Math.round(progress * 0.9), state: 'uploading' } }))
      },
    })
    dispatch(uploadChanged({ id, upload: { filename: file.name, progress: 95, state: 'verifying' } }))
  } catch (error) {
    const failed = { ok: false, error: error.response?.data?.error || { message: error.message } }
    dispatch(recordFailed({ id, error: failed.error }))
    return failed
  }
  const finalized = await dispatch(call({
    url: `/production-records/${id}/attachments/${intent.payload.data.attachment.id}/finalize`,
    method: 'post',
    data: {},
  }))
  if (!finalized?.ok) {
    dispatch(recordFailed({ id, error: finalized?.error || { message: 'The upload could not be verified.' } }))
    return finalized
  }
  const attachment = finalized.payload?.data?.attachment
  dispatch(uploadChanged({
    id,
    upload: {
      filename: file.name,
      progress: 100,
      state: attachment?.state === 'available' ? 'complete' : 'security_check',
    },
  }))
  await dispatch(loadProductionCollaboration(id))
  return finalized
}

export const requestAttachmentDownload = (id, attachmentId) => async dispatch => {
  const result = await dispatch(call({
    url: `/production-records/${id}/attachments/${attachmentId}/download-intent`,
    method: 'post',
    data: {},
  }))
  if (result?.ok && typeof window !== 'undefined') {
    const target = result.payload.data.download.target
    openDownloadTarget(target)
  }
  return result
}

const stateFor = state => state.entities.productionCollaboration
export const productionCollaborationSelectors = {
  getRecord: id => state => stateFor(state).byRecord[String(id)] || EMPTY_RECORD,
  getSummary: state => stateFor(state).summary,
  getSummaryLoading: state => stateFor(state).summaryLoading,
  getSummaryError: state => stateFor(state).summaryError,
}

export default slice.reducer
