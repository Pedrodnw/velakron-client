import { createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../../api'
import { openDownloadTarget, resolveFileTransferTarget, uploadFileToIntent } from '../../fileTransfer'
import { uploadMimeForFile } from '../../modelFiles'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'

const initialState = { plansByRevision: {}, runsByProduction: {}, detailsByRun: {}, attachmentsByRun: {}, summary: null, queue: [], queueView: '', loading: false, mutating: false, upload: null, error: null }
const emptyAttachments = Object.freeze({ attachments: Object.freeze([]), pagination: Object.freeze({ page: 1, page_size: 50, total: 0, pages: 1 }) })
const slice = createSlice({
  name: 'inspection', initialState,
  reducers: {
    requested: state => { state.loading = true; state.error = null },
    mutating: state => { state.mutating = true; state.error = null },
    planReceived: (state, action) => { state.plansByRevision[String(action.payload.revisionId)] = action.payload.data?.data || action.payload.data; state.loading = false; state.mutating = false; state.error = null },
    runsReceived: (state, action) => { state.runsByProduction[String(action.payload.productionId)] = action.payload.data?.data?.runs || []; state.loading = false; state.error = null },
    detailReceived: (state, action) => { const data = action.payload?.data || action.payload; if (data?.run) state.detailsByRun[String(data.run.id || data.run._id)] = data; state.loading = false; state.mutating = false; state.error = null },
    attachmentsReceived: (state, action) => { state.attachmentsByRun[String(action.payload.runId)] = action.payload.data?.data || action.payload.data; state.loading = false; state.error = null },
    summaryReceived: (state, action) => { state.summary = action.payload?.data || action.payload; state.loading = false },
    queueReceived: (state, action) => { state.queue = action.payload?.data?.runs || action.payload?.runs || []; state.queueView = action.payload?.view || ''; state.loading = false },
    uploadChanged: (state, action) => { state.upload = action.payload },
    failed: (state, action) => { state.loading = false; state.mutating = false; state.upload = null; state.error = action.payload?.error || action.payload },
  },
  extraReducers: builder => { builder.addCase(organizationContextCleared, () => initialState); builder.addCase(organizationSwitchRequested, () => initialState) },
})
const { requested, mutating, planReceived, runsReceived, detailReceived, attachmentsReceived, summaryReceived, queueReceived, uploadChanged, failed } = slice.actions
const call = options => apiCallBegan({ organizationScoped: true, ...options })
const mutate = options => call({ method: 'post', onStart: mutating.type, onError: failed.type, ...options })

export const loadInspectionPlan = (partId, revisionId) => async dispatch => {
  const result = await dispatch(call({ url: `/parts/${partId}/revisions/${revisionId}/inspection-plan`, onStart: requested.type, requestKey: `inspection-plan-${revisionId}` }))
  if (result?.ok) dispatch(planReceived({ revisionId, data: result.payload }))
  else if (!result?.cancelled) dispatch(failed(result?.error || { message: 'Inspection plan could not be loaded.' }))
  return result
}
export const createInspectionPlan = (partId, revisionId, data) => mutate({ url: `/parts/${partId}/revisions/${revisionId}/inspection-plan`, data })
export const updateInspectionPlan = (planId, data) => mutate({ url: `/inspection-plans/${planId}`, method: 'patch', data })
export const addInspectionCharacteristic = (planId, data) => mutate({ url: `/inspection-plans/${planId}/characteristics`, data })
export const updateInspectionCharacteristic = (characteristicId, data) => mutate({ url: `/inspection-plans/characteristics/${characteristicId}`, method: 'patch', data })
export const archiveInspectionCharacteristic = (characteristicId, data) => mutate({ url: `/inspection-plans/characteristics/${characteristicId}/archive`, data })
export const reorderInspectionCharacteristics = (planId, characteristicIds) => mutate({ url: `/inspection-plans/${planId}/reorder`, data: { characteristic_ids: characteristicIds } })
export const bulkUpdateInspectionCharacteristics = (planId, characteristicIds, versions, updates) => mutate({
  url: `/inspection-plans/${planId}/characteristics/bulk`,
  method: 'patch',
  data: { characteristic_ids: characteristicIds, versions, updates },
})
export const validateInspectionPlan = planId => call({ url: `/inspection-plans/${planId}/validate`, method: 'post', data: {} })

export const loadInspectionRuns = productionId => async dispatch => {
  const result = await dispatch(call({ url: '/inspection/runs', params: { production_record: productionId }, onStart: requested.type, requestKey: `inspection-runs-${productionId}` }))
  if (result?.ok) dispatch(runsReceived({ productionId, data: result.payload }))
  else if (!result?.cancelled) dispatch(failed(result?.error || { message: 'Inspection runs could not be loaded.' }))
  return result
}
export const loadInspectionRun = (runId, resultPage = 1, resultPageSize = 50) => call({ url: `/inspection/runs/${runId}`, params: { result_page: resultPage, result_page_size: resultPageSize }, onStart: requested.type, onSuccess: detailReceived.type, onError: failed.type, requestKey: `inspection-run-${runId}-${resultPage}` })
export const loadInspectionSummary = () => call({ url: '/inspection/actions/summary', onStart: requested.type, onSuccess: summaryReceived.type, onError: failed.type, requestKey: 'inspection-summary' })
export const loadInspectionQueue = view => async dispatch => {
  const result = await dispatch(call({ url: '/inspection/runs', params: { view }, onStart: requested.type, requestKey: `inspection-queue-${view}` }))
  if (result?.ok) dispatch(queueReceived({ ...(result.payload?.data || {}), view }))
  else if (!result?.cancelled) dispatch(failed(result?.error || { message: 'Inspection actions could not be loaded.' }))
  return result
}
export const recordInspectionResult = (runId, data) => mutate({ url: `/inspection/runs/${runId}/results`, data, onSuccess: detailReceived.type })
export const updateInspectionRunAssignment = (runId, data) => mutate({ url: `/inspection/runs/${runId}/assignment`, method: 'patch', data, onSuccess: detailReceived.type })
export const confirmInspectionFailure = (resultId, data) => mutate({ url: `/inspection/results/${resultId}/confirm-failure`, data })
export const submitInspectionPackage = (runId, declaration) => mutate({ url: `/inspection/runs/${runId}/submissions`, data: { declaration }, onSuccess: detailReceived.type })
export const reviewInspectionPackage = (submissionId, data) => mutate({ url: `/inspection/submissions/${submissionId}/review`, data, onSuccess: detailReceived.type })
export const compareInspectionSubmissions = (submissionId, against = 'previous') => call({ url: `/inspection/submissions/${submissionId}/compare`, params: { against } })
export const previewInspectionImport = (runId, data) => mutate({ url: `/inspection/runs/${runId}/imports/preview`, data })
export const commitInspectionImport = importId => mutate({ url: `/inspection/imports/${importId}/commit`, data: {}, onSuccess: detailReceived.type })
export const loadInspectionAttachments = (runId, page = 1, pageSize = 50) => async dispatch => {
  const result = await dispatch(call({ url: `/inspection/runs/${runId}/attachments`, params: { page, page_size: pageSize }, onStart: requested.type, requestKey: `inspection-attachments-${runId}-${page}` }))
  if (result?.ok) dispatch(attachmentsReceived({ runId, data: result.payload }))
  else if (!result?.cancelled) dispatch(failed(result?.error || { message: 'Inspection evidence could not be loaded.' }))
  return result
}
export const requestInspectionAttachmentView = (runId, attachmentId, attestation = {}) => async dispatch => {
  const result = await dispatch(call({ url: `/inspection/runs/${runId}/attachments/${attachmentId}/view-intent`, method: 'post', data: attestation }))
  if (result?.ok && typeof window !== 'undefined') window.open(resolveFileTransferTarget(result.payload.data.view.target), '_blank', 'noopener,noreferrer')
  return result
}
export const requestInspectionAttachmentDownload = (runId, attachmentId, attestation = {}) => async dispatch => {
  const result = await dispatch(call({ url: `/inspection/runs/${runId}/attachments/${attachmentId}/download-intent`, method: 'post', data: attestation }))
  if (result?.ok) openDownloadTarget(result.payload.data.download.target)
  return result
}

export const uploadInspectionEvidence = (runId, { file, resultId = '', category = 'inspection_evidence' }) => async dispatch => {
  dispatch(mutating()); dispatch(uploadChanged({ filename: file.name, progress: 0, state: 'preparing' }))
  const intent = await dispatch(call({ url: `/inspection/runs/${runId}/attachments/intents`, method: 'post', data: { filename: file.name, mime_type: uploadMimeForFile(file), byte_size: file.size, result_id: resultId || undefined, category } }))
  if (!intent?.ok) { dispatch(failed(intent?.error || { message: 'The upload could not be prepared.' })); return intent }
  try {
    await uploadFileToIntent({ file, upload: intent.payload.data.upload, onProgress: progress => dispatch(uploadChanged({ filename: file.name, progress: Math.round(progress * 0.9), state: 'uploading' })) })
  } catch (error) { const failure = { message: error.message }; dispatch(failed(failure)); return { ok: false, error: failure } }
  const done = await dispatch(call({ url: `/inspection/runs/${runId}/attachments/${intent.payload.data.attachment.id}/finalize`, method: 'post', data: {} }))
  if (done?.ok) dispatch(uploadChanged({ filename: file.name, progress: 100, state: 'complete' })); else dispatch(failed(done?.error || { message: 'Evidence could not be verified.' }))
  return done
}

const stateFor = state => state.entities.inspection
export const inspectionSelectors = {
  getPlan: revisionId => state => stateFor(state).plansByRevision[String(revisionId)] || null,
  getRuns: productionId => state => stateFor(state).runsByProduction[String(productionId)] || [],
  getRunDetail: runId => state => stateFor(state).detailsByRun[String(runId)] || null,
  getAttachments: runId => state => stateFor(state).attachmentsByRun[String(runId)] || emptyAttachments,
  getSummary: state => stateFor(state).summary,
  getQueue: state => stateFor(state).queue,
  getQueueView: state => stateFor(state).queueView,
  getLoading: state => stateFor(state).loading,
  getMutating: state => stateFor(state).mutating,
  getUpload: state => stateFor(state).upload,
  getError: state => stateFor(state).error,
}

export default slice.reducer
