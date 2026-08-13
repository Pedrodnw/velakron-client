import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  ListChecks,
  Plus,
  Search,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader,
  AppSkeleton,
  ConfirmationDialog,
  EmptyState,
  ErrorState,
  FilterBar,
  MetricCard,
  PermissionDenied,
  Tabs,
} from '../../components/app'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import { Button } from '../../components/design-system'
import { getAuthUser } from '../../store/slices/auth'
import FounderTaskCard from '../../components/app/tasks/FounderTaskCard'
import FounderTaskDetailDrawer from '../../components/app/tasks/FounderTaskDetailDrawer'
import FounderTaskDrawer from '../../components/app/tasks/FounderTaskDrawer'
import PriorityMatrix from '../../components/app/tasks/PriorityMatrix'
import { dateInputToIso, dueDateForUrgency } from '../../components/app/tasks/taskMatrix'
import { WidePortalPageLayout } from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import { getHasPermission } from '../../store/slices/appContext'
import {
  archiveInternalTask,
  clearInternalTaskDetail,
  createInternalTaskMessage,
  createInternalTask,
  internalTaskSelectors,
  loadInternalTaskAssignees,
  loadInternalTaskDetail,
  loadInternalTasks,
  requestInternalTaskAttachmentDownload,
  removeInternalTaskAttachment,
  updateInternalTask,
  uploadInternalTaskAttachment,
} from '../../store/slices/entities/internalTasks'

const activeStatuses = ['open', 'in_progress', 'blocked']
const importanceOrder = ['high', 'medium', 'low']
const urgencyOrder = ['high', 'medium', 'low']

const FounderTasks = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const canRead = useSelector(getHasPermission('internal_task.read'))
  const canCreate = useSelector(getHasPermission('internal_task.create'))
  const canUpdate = useSelector(getHasPermission('internal_task.update'))
  const canArchive = useSelector(getHasPermission('internal_task.archive'))
  const user = useSelector(getAuthUser)
  const tasks = useSelector(internalTaskSelectors.getTasks)
  const assignees = useSelector(internalTaskSelectors.getAssignees)
  const loading = useSelector(internalTaskSelectors.getLoading)
  const mutating = useSelector(internalTaskSelectors.getMutating)
  const error = useSelector(internalTaskSelectors.getError)
  const mutationError = useSelector(internalTaskSelectors.getMutationError)
  const detail = useSelector(internalTaskSelectors.getDetail)
  const detailLoading = useSelector(internalTaskSelectors.getDetailLoading)
  const collaborationMutating = useSelector(internalTaskSelectors.getCollaborationMutating)
  const upload = useSelector(internalTaskSelectors.getUpload)
  const [tab, setTab] = useState('matrix')
  const [drawerTask, setDrawerTask] = useState(undefined)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [detailTask, setDetailTask] = useState(null)
  const [detailTab, setDetailTab] = useState('details')
  const [detailOpen, setDetailOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [fileRemoveTarget, setFileRemoveTarget] = useState(null)
  const handledTaskQuery = useRef('')
  const taskHistoryPushed = useRef(false)
  const [feedback, setFeedback] = useState(null)
  const [filters, setFilters] = useState({ search: '', assignee: '', project: '', status: '' })

  const reload = useCallback(() => {
    if (!canRead) return
    dispatch(loadInternalTasks({ page_size: 100 }))
    dispatch(loadInternalTaskAssignees())
  }, [canRead, dispatch])

  useEffect(() => { reload() }, [reload])
  useEffect(() => {
    if (!router.isReady || !['matrix', 'list', 'closed'].includes(router.query.view)) return
    setTab(router.query.view)
  }, [router.isReady, router.query.view])
  useEffect(() => {
    const requestedId = String(router.query.task || '')
    if (!router.isReady) return
    if (!requestedId) {
      handledTaskQuery.current = ''
      taskHistoryPushed.current = false
      if (detailOpen) {
        setDetailOpen(false)
        setDetailTask(null)
        setDetailTab('details')
        setFeedback(null)
        dispatch(clearInternalTaskDetail())
      }
      return
    }
    if (handledTaskQuery.current === requestedId || detailOpen || !tasks.length) return
    const requestedTask = tasks.find(task => task.id === requestedId)
    if (!requestedTask) return
    handledTaskQuery.current = requestedId
    setDetailTask(requestedTask)
    setDetailOpen(true)
    setFeedback(null)
    dispatch(loadInternalTaskDetail(requestedId))
  }, [detailOpen, dispatch, router.isReady, router.query.task, tasks])

  const projects = useMemo(() => [...new Set(tasks.map(task => task.project_name).filter(Boolean))].sort(), [tasks])
  const visibleTasks = useMemo(() => tasks.filter(task => {
    const search = filters.search.trim().toLowerCase()
    if (search && !`${task.title} ${task.description} ${task.project_name}`.toLowerCase().includes(search)) return false
    if (filters.assignee && !(task.assignees || []).some(item => item.id === filters.assignee)) return false
    if (filters.project && task.project_name !== filters.project) return false
    if (filters.status && task.status !== filters.status) return false
    return true
  }), [filters, tasks])
  const activeTasks = visibleTasks.filter(task => activeStatuses.includes(task.status))
  const closedTasks = visibleTasks.filter(task => ['completed', 'cancelled'].includes(task.status))
  const overdueCount = tasks.filter(task => task.overdue && activeStatuses.includes(task.status)).length
  const blockedCount = tasks.filter(task => task.status === 'blocked').length

  if (!canRead) return <PermissionDenied description='Founder task access is available only to Velakron founders and administrators.' />
  if (loading && !tasks.length) return <section className='appPanel'><AppSkeleton lines={10} /></section>

  const openCreate = () => { setDrawerTask(null); setFeedback(null); setDrawerOpen(true) }
  const openEdit = task => {
    setDetailOpen(false)
    setDetailTask(null)
    dispatch(clearInternalTaskDetail())
    if (router.isReady && router.query.task) {
      const query = { ...router.query }
      delete query.task
      router.replace({ pathname: router.pathname, query }, undefined, { shallow: true })
    }
    taskHistoryPushed.current = false
    setDrawerTask(task)
    setFeedback(null)
    setDrawerOpen(true)
  }
  const closeDrawer = () => { if (!mutating) { setDrawerOpen(false); setDrawerTask(undefined); setFeedback(null) } }
  const openTask = (task, initialTab = 'details') => {
    handledTaskQuery.current = task.id
    setDetailTask(task)
    setDetailTab(initialTab)
    setDetailOpen(true)
    setFeedback(null)
    dispatch(loadInternalTaskDetail(task.id))
    if (router.isReady && router.query.task !== task.id) {
      taskHistoryPushed.current = true
      router.push({ pathname: router.pathname, query: { ...router.query, task: task.id } }, undefined, { shallow: true })
    }
  }
  const closeDetail = () => {
    if (collaborationMutating) return
    setDetailOpen(false)
    setDetailTask(null)
    setDetailTab('details')
    setFeedback(null)
    dispatch(clearInternalTaskDetail())
    if (router.isReady && router.query.task) {
      if (taskHistoryPushed.current) {
        taskHistoryPushed.current = false
        router.back()
        return
      }
      const query = { ...router.query }
      delete query.task
      router.replace({ pathname: router.pathname, query }, undefined, { shallow: true })
    }
  }

  const submitTask = async form => {
    const dueAt = dateInputToIso(form.due_date)
    if (!dueAt) { setFeedback({ type: 'error', message: 'Choose a valid due date.' }); return }
    const payload = {
      title: form.title,
      description: form.description,
      project_name: form.project_name,
      status: form.status,
      importance: form.importance,
      due_at: dueAt,
      assignee_ids: form.assignee_ids,
      ...(drawerTask ? { version: drawerTask.version } : {}),
    }
    setFeedback(null)
    const result = await dispatch(drawerTask
      ? updateInternalTask(drawerTask.id, payload)
      : createInternalTask(payload))
    if (!result?.ok) {
      setFeedback({ type: 'error', message: resultError(result, 'We could not save this task.') })
      return
    }
    setDrawerOpen(false)
    setDrawerTask(undefined)
    setFeedback({ type: 'success', message: drawerTask ? 'Task updated.' : 'Task created.' })
    dispatch(loadInternalTasks({ page_size: 100 }))
  }

  const moveTask = async (task, axis, direction) => {
    let change
    if (axis === 'importance') {
      const index = importanceOrder.indexOf(task.importance)
      const target = direction === 'high' ? Math.max(0, index - 1) : Math.min(importanceOrder.length - 1, index + 1)
      change = { importance: importanceOrder[target] }
    } else {
      const index = urgencyOrder.indexOf(task.urgency)
      const target = direction === 'high' ? Math.max(0, index - 1) : Math.min(urgencyOrder.length - 1, index + 1)
      change = { due_at: dueDateForUrgency(urgencyOrder[target]) }
    }
    setFeedback(null)
    const result = await dispatch(updateInternalTask(task.id, { ...change, version: task.version }))
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The task could not be moved.') })
    else dispatch(loadInternalTasks({ page_size: 100 }))
  }

  const completeTask = async task => {
    setFeedback(null)
    const result = await dispatch(updateInternalTask(task.id, { status: 'completed', version: task.version }))
    if (!result?.ok) {
      setFeedback({ type: 'error', message: resultError(result, 'The task could not be completed.') })
      return false
    }
    setFeedback({ type: 'success', message: `“${task.title}” completed.` })
    dispatch(loadInternalTasks({ page_size: 100 }))
    if (detailOpen && detailTask?.id === task.id) {
      setDetailTask(result.payload.data.task)
      dispatch(loadInternalTaskDetail(task.id))
    }
    return true
  }

  const sendMessage = async body => {
    const result = await dispatch(createInternalTaskMessage(detailTask.id, body))
    if (!result?.ok) {
      setFeedback({ type: 'error', message: resultError(result, 'The message could not be sent.') })
      return false
    }
    setFeedback({ type: 'success', message: 'Message sent.' })
    return true
  }

  const uploadFile = async file => {
    const result = await dispatch(uploadInternalTaskAttachment(detailTask.id, { file }))
    if (!result?.ok) {
      setFeedback({ type: 'error', message: resultError(result, 'The file could not be uploaded.') })
      return false
    }
    setFeedback({ type: 'success', message: 'File uploaded and verified.' })
    return true
  }

  const downloadFile = async file => {
    const result = await dispatch(requestInternalTaskAttachmentDownload(detailTask.id, file.id))
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The file could not be downloaded.') })
  }

  const removeFile = async () => {
    if (!fileRemoveTarget || !detailTask) return
    const result = await dispatch(removeInternalTaskAttachment(detailTask.id, fileRemoveTarget.id))
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The file could not be removed.') })
    else {
      setFeedback({ type: 'success', message: 'File removed from the task.' })
      dispatch(loadInternalTasks({ page_size: 100 }))
    }
    setFileRemoveTarget(null)
  }

  const requestArchive = task => {
    setDrawerOpen(false)
    setDrawerTask(undefined)
    setArchiveTarget(task)
  }

  const confirmArchive = async () => {
    const task = archiveTarget
    const result = await dispatch(archiveInternalTask(task.id, {
      version: task.version,
      reason: 'Removed from the active founder task workspace.',
    }))
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The task could not be archived.') })
    else {
      setFeedback({ type: 'success', message: 'Task archived.' })
      dispatch(loadInternalTasks({ page_size: 100 }))
    }
    setArchiveTarget(null)
  }

  return <>
    <Seo title='Tasks & priorities' description='Velakron founder task workspace and priority matrix.' path='/app/tasks' noIndex />
    <div className='founderTasksPage'>
    <AppPageHeader
      eyebrow='Founder workspace'
      title='Tasks & priorities'
      description='Turn company priorities into clear owners and deadlines. The matrix separates strategic impact from time urgency.'
      actions={canCreate && <Button onClick={openCreate}><Plus aria-hidden='true' /> New task</Button>}
    />
    <section className='metricGrid founderTaskMetrics' aria-label='Task summary'>
      <MetricCard label='Active tasks' value={tasks.filter(task => activeStatuses.includes(task.status)).length} detail='Open, in progress, or blocked' icon={ListChecks} />
      <MetricCard label='Overdue' value={overdueCount} detail='Active tasks past their due date' icon={AlertTriangle} tone={overdueCount ? 'danger' : 'default'} />
      <MetricCard label='Blocked' value={blockedCount} detail='Waiting on a decision or dependency' icon={CircleDot} tone={blockedCount ? 'warning' : 'default'} />
      <MetricCard label='Completed' value={tasks.filter(task => task.status === 'completed').length} detail='Finished work in this view' icon={CheckCircle2} tone='success' />
    </section>
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    {mutationError && !feedback && <FormMessage type='error'>{mutationError.message || 'The task change could not be saved.'}</FormMessage>}
    {error && <ErrorState title='Tasks are temporarily unavailable' description={error.message} onRetry={reload} />}
    <div className='founderTasksToolbar'>
      <Tabs items={[
        { key: 'matrix', label: 'Priority matrix', count: activeTasks.length },
        { key: 'list', label: 'All tasks', count: visibleTasks.length },
        { key: 'closed', label: 'Completed', count: closedTasks.length },
      ]} activeKey={tab} onChange={setTab} label='Task views' />
    </div>
    <FilterBar label='Task filters' actions={<Button variant='secondary' onClick={() => setFilters({ search: '', assignee: '', project: '', status: '' })}>Clear filters</Button>}>
      <label><span>Search</span><div className='inputWithIcon'><Search aria-hidden='true' /><input type='search' value={filters.search} onChange={event => setFilters(current => ({ ...current, search: event.target.value }))} placeholder='Task, project, or detail' /></div></label>
      <label><span>Assignee</span><select value={filters.assignee} onChange={event => setFilters(current => ({ ...current, assignee: event.target.value }))}><option value=''>Everyone</option>{assignees.map(assignee => <option key={assignee.id} value={assignee.id}>{assignee.user?.full_name}</option>)}</select></label>
      <label><span>Project</span><select value={filters.project} onChange={event => setFilters(current => ({ ...current, project: event.target.value }))}><option value=''>All workstreams</option>{projects.map(project => <option key={project} value={project}>{project}</option>)}</select></label>
      {tab === 'list' && <label><span>Status</span><select value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value=''>All statuses</option><option value='open'>Open</option><option value='in_progress'>In progress</option><option value='blocked'>Blocked</option><option value='completed'>Completed</option><option value='cancelled'>Cancelled</option></select></label>}
    </FilterBar>

    {tab === 'matrix' && <PriorityMatrix tasks={activeTasks} onOpen={openTask} onEdit={openEdit} onMove={moveTask} onComplete={completeTask} canUpdate={canUpdate} mutating={mutating} />}
    {tab === 'list' && <section className='founderTaskList' aria-label='All founder tasks'>{visibleTasks.length ? visibleTasks.map(task => <FounderTaskCard key={task.id} task={task} onOpen={openTask} onEdit={openEdit} onComplete={!['completed', 'cancelled'].includes(task.status) ? completeTask : undefined} canUpdate={canUpdate} mutating={mutating} />) : <EmptyState title='No tasks match these filters' description='Clear a filter or create a new task.' />}</section>}
    {tab === 'closed' && <section className='founderTaskList' aria-label='Completed and cancelled founder tasks'>{closedTasks.length ? closedTasks.map(task => <FounderTaskCard key={task.id} task={task} onOpen={openTask} onEdit={openEdit} canUpdate={canUpdate} mutating={mutating} />) : <EmptyState icon={CheckCircle2} title='No completed tasks yet' description='Finished and cancelled work will appear here.' />}</section>}

    <FounderTaskDetailDrawer
      open={detailOpen}
      initialTab={detailTab}
      detail={detail}
      fallbackTask={detailTask}
      loading={detailLoading}
      pending={collaborationMutating || mutating}
      upload={upload}
      feedback={feedback}
      onClose={closeDetail}
      onEdit={openEdit}
      onComplete={completeTask}
      onMessage={sendMessage}
      onUpload={uploadFile}
      onDownload={downloadFile}
      onRemove={setFileRemoveTarget}
      userId={user?.id || user?._id}
      canUpdate={canUpdate}
    />
    <FounderTaskDrawer open={drawerOpen} task={drawerTask} assignees={assignees} pending={mutating} feedback={feedback} onClose={closeDrawer} onSubmit={submitTask} onArchive={requestArchive} canArchive={canArchive} />
    <ConfirmationDialog open={Boolean(archiveTarget)} title='Archive this task?' description='It will leave the active founder workspace but remain in the company audit history.' confirmLabel='Archive task' onConfirm={confirmArchive} onClose={() => setArchiveTarget(null)} danger confirmDisabled={mutating} />
    <ConfirmationDialog open={Boolean(fileRemoveTarget)} title='Remove this task file?' description='It will no longer be available from the task. Its upload and removal remain in the audit history.' confirmLabel='Remove file' onConfirm={removeFile} onClose={() => setFileRemoveTarget(null)} danger confirmDisabled={collaborationMutating} />
    </div>
  </>
}

FounderTasks.getLayout = WidePortalPageLayout
export default FounderTasks
