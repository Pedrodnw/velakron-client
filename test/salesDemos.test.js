import { describe, expect, it } from 'vitest'
import { salesDemoActionKey, salesDemoRouteMap } from '../store/salesDemoTracking'
import { getNavigationItems } from '../components/app/navigation'
import {
  loadSalesDemoSessions,
  salesDemoRequest,
} from '../store/slices/entities/salesDemos'
import salesDemoReducer from '../store/slices/entities/salesDemos'
import { salesDemoPresenterHeaders } from '../store/middleware/api'
import { fileTransferFetchOptions } from '../store/fileTransfer'

describe('founder Sales Demo workspace', () => {
  it('shows the dashboard only when the founder Sales Demo permission is present', () => {
    const hidden = getNavigationItems('velakron', ['internal_task.read'])
    expect(hidden.some(item => item.href === '/app/sales-demo')).toBe(false)
    const visible = getNavigationItems('velakron', ['sales_demo.read'])
    expect(visible.find(item => item.href === '/app/sales-demo')?.label).toBe('Sales Demo')
  })

  it('builds founder-scoped list and mutation contracts through the shared API middleware', () => {
    const list = loadSalesDemoSessions({ status: 'active', page_size: 50 })
    expect(list.payload).toMatchObject({
      url: '/sales-demos/sessions',
      params: { status: 'active', page_size: 50 },
      organizationScoped: true,
    })
    const mutation = salesDemoRequest({ url: '/sessions/demo-id/reset', method: 'post', data: { expected_revision: 3 } })
    expect(mutation.payload).toMatchObject({
      url: '/sales-demos/sessions/demo-id/reset',
      method: 'post',
      data: { expected_revision: 3 },
      organizationScoped: true,
    })
  })

  it('maps product routes to privacy-safe journey keys without retaining full URLs', () => {
    expect(salesDemoRouteMap('/app')).toEqual({ route_key: 'overview', journey_step: 'overview' })
    expect(salesDemoRouteMap('/app/production/[id]')).toEqual({ route_key: 'production_detail', journey_step: 'production_detail' })
    expect(salesDemoRouteMap('/app/suppliers/[id]')).toEqual({ route_key: 'relationship_detail', journey_step: 'relationship_network' })
    expect(salesDemoRouteMap('/app/machines/[id]')).toEqual({ route_key: 'machines', journey_step: 'machines' })
    expect(salesDemoActionKey('patch', '/production-records/64ff00/private-part')).toBe('production.patch')
    expect(salesDemoActionKey('post', '/relationships/64ff00/accept')).toBe('relationship.post')
    expect(salesDemoActionKey('post', '/production-records/private-id/accept')).toBe('production.assignment_accepted')
    expect(salesDemoActionKey('post', '/production-records/private-id/forecast')).toBe('production.forecast_updated')
    expect(salesDemoActionKey('post', '/production-records/private-id/machine')).toBe('production.machine_changed')
    expect(salesDemoActionKey('post', '/production-records/private-id/transition')).toBe('production.stage_changed')
    expect(salesDemoActionKey('patch', '/production-records/private-id/forecast')).toBe('production.patch')
  })

  it('stores Sales Demo request outcomes and resets loading after success or failure', () => {
    const requested = salesDemoReducer(undefined, { type: 'salesDemos/requested' })
    expect(requested.loading).toBe(true)
    const succeeded = salesDemoReducer(requested, { type: 'salesDemos/summaryReceived', payload: { data: { counts: { active_prospects: 2 } } } })
    expect(succeeded.loading).toBe(false)
    expect(succeeded.summary.counts.active_prospects).toBe(2)
    const failed = salesDemoReducer(requested, { type: 'salesDemos/failed', payload: { error: { code: 'VERSION_CONFLICT', message: 'Refresh first' } } })
    expect(failed.loading).toBe(false)
    expect(failed.error.code).toBe('VERSION_CONFLICT')
  })

  it('adds a tab-local presenter grant to product calls but never to the one-time exchange', () => {
    expect(salesDemoPresenterHeaders({ url: '/production-records', pathname: '/app', presenterToken: 'opaque-preview-token' }))
      .toEqual({ 'X-Velakron-Demo-Presenter': 'opaque-preview-token' })
    expect(salesDemoPresenterHeaders({ url: '/auth/session', pathname: '/sales-demo/preview', presenterToken: 'stale-token' }))
      .toEqual({})
    expect(salesDemoPresenterHeaders({ url: '/sales-demos/presenter-grants/exchange', pathname: '/sales-demo/preview', presenterToken: 'stale-token' }))
      .toEqual({})
  })

  it('carries the presenter grant when a protected local asset is streamed', () => {
    const previousWindow = global.window
    global.window = {
      sessionStorage: {
        getItem: key => key === 'velakron_sales_demo_presenter' ? 'opaque-preview-token' : null,
      },
    }
    expect(fileTransferFetchOptions('/parts/part-id/assets/asset-id/view-content')).toMatchObject({
      credentials: 'include',
      headers: { 'X-Velakron-Demo-Presenter': 'opaque-preview-token' },
    })
    expect(fileTransferFetchOptions('https://storage.example.test/signed-object')).toMatchObject({
      credentials: 'omit',
      headers: {},
    })
    global.window = previousWindow
  })
})
