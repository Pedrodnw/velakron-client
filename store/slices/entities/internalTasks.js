import { createSelector, createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../../api'
import { openDownloadTarget, uploadFileToIntent } from '../../fileTransfer'
import { uploadMimeForFile } from '../../modelFiles'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'

const initialState = {
  ids: [],
  byId: {},
  assignees: [],
  detail: null,
  summary: {},
  pagination: null,
  loading: false,
  assigneesLoading: false,
  detailLoading: false,
  collaborationMutating: false,
  upload: null,
  mutating: false,
  error: null,
  mutationError: null,
  lastFetched: null,
}

const normalize = records => (records || []).reduce((result, task) => {
  const id = String(task.id || task._id)
  if (!id) return result
  result.ids.push(id)
  result.byId[id] = task
  return result
}, { ids: [], byId: {} })

const slice = createSlice({
  name: 'internalTasks',
  initialState,
  reducers: {
    listRequested: state => { state.loading = true; state.error = null },
    listReceived: (state, action) => {
      const normalized = normalize(action.payload?.data?.tasks)
      state.ids = normalized.ids
      state.byId = normalized.byId
      state.summary = action.payload?.data?.summary || {}
      state.pagination = action.payload?.meta || null
      state.loading = false
      state.error = null
      state.lastFetched = Date.now()
    },
    assigneesRequested: state => { state.assigneesLoading = true },
    assigneesReceived: (state, action) => {
      state.assignees = action.payload?.data?.assignees || []
      state.assigneesLoading = false
    },
    detailRequested: state => {
      state.detailLoading = true
      state.error = null
    },
    detailReceived: (state, action) => {
      const data = action.payload?.data || {}
      const task = data.task
      if (!task?.id) return
      state.detail = {
        task,
        messages: data.messages || [],
        attachments: data.attachments || [],
      }
      if (!state.ids.includes(task.id)) state.ids.unshift(task.id)
      state.byId[task.id] = task
      state.detailLoading = false
      state.collaborationMutating = false
      state.upload = null
      state.error = null
      state.mutationError = null
    },
    detailCleared: state => {
      state.detail = null
      state.detailLoading = false
      state.collaborationMutating = false
      state.upload = null
    },
    collaborationRequested: state => {
      state.collaborationMutating = true
      state.mutationError = null
    },
    uploadChanged: (state, action) => { state.upload = action.payload },
    requestFailed: (state, action) => {
      state.loading = false
      state.assigneesLoading = false
      state.detailLoading = false
      state.collaborationMutating = false
      state.upload = null
      state.error = action.payload?.error || action.payload
    },
    mutationRequested: state => { state.mutating = true; state.mutationError = null },
    taskReceived: (state, action) => {
      const task = action.payload?.data?.task
      if (!task?.id) return
      if (!state.ids.includes(task.id)) state.ids.unshift(task.id)
      state.byId[task.id] = task
      state.mutating = false
      state.mutationError = null
    },
    taskArchived: (state, action) => {
      const id = String(action.payload?.data?.task_id || '')
      state.ids = state.ids.filter(item => item !== id)
      delete state.byId[id]
      state.mutating = false
      state.mutationError = null
    },
    mutationFailed: (state, action) => {
      state.mutating = false
      state.collaborationMutating = false
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

export const loadInternalTasks = (params = {}) => scopedCall({
  url: '/tasks',
  params,
  onStart: actions.listRequested.type,
  onSuccess: actions.listReceived.type,
  onError: actions.requestFailed.type,
  requestKey: 'internal-tasks-list',
})

export const loadInternalTaskAssignees = () => scopedCall({
  url: '/tasks/assignees',
  onStart: actions.assigneesRequested.type,
  onSuccess: actions.assigneesReceived.type,
  onError: actions.requestFailed.type,
  requestKey: 'internal-task-assignees',
})

export const loadInternalTaskDetail = id => scopedCall({
  url: `/tasks/${id}`,
  onStart: actions.detailRequested.type,
  onSuccess: actions.detailReceived.type,
  onError: actions.requestFailed.type,
  requestKey: `internal-task-detail-${id}`,
})

const mutateTask = ({ id, method, data, archived = false }) => scopedCall({
  url: id ? `/tasks/${id}` : '/tasks',
  method,
  data,
  onStart: actions.mutationRequested.type,
  onSuccess: archived ? actions.taskArchived.type : actions.taskReceived.type,
  onError: actions.mutationFailed.type,
  requestKey: `internal-task-mutation-${id || 'create'}`,
})

export const createInternalTask = data => mutateTask({ method: 'post', data })
export const updateInternalTask = (id, data) => mutateTask({ id, method: 'patch', data })
export const archiveInternalTask = (id, data) => mutateTask({ id, method: 'delete', data, archived: true })

const collaborationCall = options => scopedCall(options)

export const createInternalTaskMessage = (id, body) => async dispatch => {
  dispatch(actions.collaborationRequested())
  const result = await dispatch(collaborationCall({
    url: `/tasks/${id}/messages`,
    method: 'post',
    data: { body },
  }))
  if (!result?.ok) {
    dispatch(actions.mutationFailed(result?.error || { message: 'The message could not be sent.' }))
    return result
  }
  await dispatch(loadInternalTaskDetail(id))
  return result
}

export const uploadInternalTaskAttachment = (id, { file }) => async dispatch => {
  dispatch(actions.collaborationRequested())
  dispatch(actions.uploadChanged({ filename: file.name, progress: 0, state: 'preparing' }))
  const intent = await dispatch(collaborationCall({
    url: `/tasks/${id}/attachments/intents`,
    method: 'post',
    data: {
      filename: file.name,
      mime_type: uploadMimeForFile(file),
      byte_size: file.size,
    },
  }))
  if (!intent?.ok) {
    dispatch(actions.mutationFailed(intent?.error || { message: 'The upload could not be prepared.' }))
    return intent
  }
  const upload = intent.payload.data.upload
  try {
    dispatch(actions.uploadChanged({ filename: file.name, progress: 5, state: 'uploading' }))
    await uploadFileToIntent({
      file,
      upload,
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
  const finalized = await dispatch(collaborationCall({
    url: `/tasks/${id}/attachments/${intent.payload.data.attachment.id}/finalize`,
    method: 'post',
    data: {},
  }))
  if (!finalized?.ok) {
    dispatch(actions.mutationFailed(finalized?.error || { message: 'The upload could not be verified.' }))
    return finalized
  }
  dispatch(actions.uploadChanged({ filename: file.name, progress: 100, state: 'complete' }))
  await dispatch(loadInternalTaskDetail(id))
  return finalized
}

export const requestInternalTaskAttachmentDownload = (id, attachmentId) => async dispatch => {
  const result = await dispatch(collaborationCall({
    url: `/tasks/${id}/attachments/${attachmentId}/download-intent`,
    method: 'post',
    data: {},
  }))
  if (result?.ok) openDownloadTarget(result.payload.data.download.target)
  return result
}

const root = state => state.entities.internalTasks
export const internalTaskSelectors = {
  getState: root,
  getTasks: createSelector(
    [state => root(state).ids, state => root(state).byId],
    (ids, byId) => ids.map(id => byId[id]),
  ),
  getTaskById: id => state => root(state).byId[String(id)] || null,
  getAssignees: state => root(state).assignees,
  getDetail: state => root(state).detail,
  getSummary: state => root(state).summary,
  getLoading: state => root(state).loading,
  getAssigneesLoading: state => root(state).assigneesLoading,
  getDetailLoading: state => root(state).detailLoading,
  getCollaborationMutating: state => root(state).collaborationMutating,
  getUpload: state => root(state).upload,
  getMutating: state => root(state).mutating,
  getError: state => root(state).error,
  getMutationError: state => root(state).mutationError,
  getPagination: state => root(state).pagination,
}

export const clearInternalTaskDetail = actions.detailCleared

export default slice.reducer
