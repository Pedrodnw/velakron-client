import { RefreshCw, Sparkles } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { apiCallBegan } from '../../store/api'
import { getActiveOrganization } from '../../store/slices/appContext'
import { loadProductionCollaboration, loadProductionSummary } from '../../store/slices/entities/productionCollaboration'
import { loadProductionRecord, loadProductionRecords } from '../../store/slices/entities/productionRecords'
import { loadRelationships } from '../../store/slices/entities/relationships'
import { salesDemoActionKey, salesDemoRouteMap } from '../../store/salesDemoTracking'

const SalesDemoSessionTracker = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const pathname = router.pathname
  const routeId = router.query.id
  const organization = useSelector(getActiveOrganization)
  const sequence = useRef(0)
  const revision = useRef(0)
  const [update, setUpdate] = useState(null)

  useEffect(() => {
    if (!organization?.demo_workspace) return undefined
    const location = salesDemoRouteMap(pathname)
    dispatch(apiCallBegan({
      url: '/sales-demos/current/activity',
      method: 'post',
      data: { activity_type: 'page_view', ...location },
      requestKey: 'sales-demo-page-view',
    }))
    return undefined
  }, [dispatch, organization?.demo_workspace, pathname, router.asPath])

  useEffect(() => {
    if (!organization?.demo_workspace) return undefined
    const recordMutation = event => {
      const location = salesDemoRouteMap(pathname)
      dispatch(apiCallBegan({
        url: '/sales-demos/current/activity',
        method: 'post',
        data: {
          activity_type: 'action_completed',
          action_key: salesDemoActionKey(event.detail?.method, event.detail?.path),
          ...location,
        },
      }))
    }
    window.addEventListener('velakron:demo-mutation-completed', recordMutation)
    return () => window.removeEventListener('velakron:demo-mutation-completed', recordMutation)
  }, [dispatch, organization?.demo_workspace, pathname])

  useEffect(() => {
    if (!organization?.demo_workspace) return undefined
    let active = true
    let polling = false
    let pollTimer
    let heartbeatTimer
    const stop = () => {
      active = false
      if (pollTimer) window.clearInterval(pollTimer)
      if (heartbeatTimer) window.clearInterval(heartbeatTimer)
    }
    const refreshVisibleSurface = event => {
      if (pathname === '/app') dispatch(loadProductionSummary())
      else if (pathname === '/app/production/[id]' && routeId) {
        dispatch(loadProductionRecord(routeId))
        dispatch(loadProductionCollaboration(routeId))
      } else if (pathname.startsWith('/app/production')) dispatch(loadProductionRecords())
      else if (pathname.startsWith('/app/suppliers')) dispatch(loadRelationships())
      else if (event?.entity_type) router.replace(router.asPath, undefined, { scroll: false })
    }
    const poll = async () => {
      if (document.visibilityState === 'hidden') return
      if (polling) return
      polling = true
      try {
        const result = await dispatch(apiCallBegan({
          url: '/sales-demos/current/state',
          params: { after_sequence: sequence.current },
        }))
        if (!active) return
        if (!result?.ok) {
          if (result?.error?.code === 'SALES_DEMO_ENDED') { stop(); setUpdate('This Sales Demo has ended.') }
          return
        }
        const state = result.payload?.data || {}
        if (state.status !== 'active') { stop(); setUpdate('This Sales Demo has ended.'); return }
        if (revision.current && state.revision > revision.current) {
          const founderEvents = [...(state.events || [])].reverse()
          const founderEvent = founderEvents.find(event => event.event_type === 'founder.command_completed')
            || founderEvents.find(event => String(event.event_type || '').startsWith('founder.'))
          if (founderEvent) {
            setUpdate(founderEvent.summary || 'The Sales Demo scenario was updated.')
            refreshVisibleSurface(founderEvent)
          }
        }
        revision.current = state.revision || revision.current
        sequence.current = state.event_sequence || sequence.current
      } finally {
        polling = false
      }
    }
    poll()
    pollTimer = window.setInterval(poll, 3_000)
    heartbeatTimer = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') dispatch(apiCallBegan({
        url: '/sales-demos/current/activity',
        method: 'post',
        data: { activity_type: 'heartbeat' },
      }))
    }, 15_000)
    return () => {
      stop()
    }
  }, [dispatch, organization?.demo_workspace, pathname, routeId, router])

  if (!update) return null
  return <div className='salesDemoUpdateNotice' role='status'>
    <Sparkles aria-hidden='true' />
    <span><strong>The demo just changed</strong><small>{update}</small></span>
    <button type='button' onClick={() => router.reload()}><RefreshCw aria-hidden='true' /> Refresh view</button>
    <button type='button' className='salesDemoUpdateNotice__dismiss' onClick={() => setUpdate(null)} aria-label='Dismiss update'>×</button>
  </div>
}

export default SalesDemoSessionTracker
