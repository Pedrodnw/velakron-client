import { createSelector, createSlice } from '@reduxjs/toolkit'
import { apiCallBegan } from '../../api'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'

const initialState = {
  ids: [],
  byId: {},
  assignees: [],
  summary: {},
  pagination: null,
  loading: false,
  assigneesLoading: false,
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
    requestFailed: (state, action) => {
      state.loading = false
      state.assigneesLoading = false
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

const root = state => state.entities.internalTasks
export const internalTaskSelectors = {
  getState: root,
  getTasks: createSelector(
    [state => root(state).ids, state => root(state).byId],
    (ids, byId) => ids.map(id => byId[id]),
  ),
  getTaskById: id => state => root(state).byId[String(id)] || null,
  getAssignees: state => root(state).assignees,
  getSummary: state => root(state).summary,
  getLoading: state => root(state).loading,
  getAssigneesLoading: state => root(state).assigneesLoading,
  getMutating: state => root(state).mutating,
  getError: state => root(state).error,
  getMutationError: state => root(state).mutationError,
  getPagination: state => root(state).pagination,
}

export default slice.reducer
