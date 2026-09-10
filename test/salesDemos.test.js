import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { salesDemoActionKey, salesDemoRouteMap } from '../store/salesDemoTracking'
import { getNavigationItems } from '../components/app/navigation'
import SalesDemoTutorial, { salesDemoTutorialSteps } from '../components/app/sales-demo/SalesDemoTutorial'
import {
  loadSalesDemoSessions,
  salesDemoRequest,
  salesDemoTelemetry,
} from '../store/slices/entities/salesDemos'
import salesDemoReducer from '../store/slices/entities/salesDemos'
import { salesDemoPresenterHeaders } from '../store/middleware/api'
import { fileTransferFetchOptions } from '../store/fileTransfer'

describe('founder Sales Demo workspace', () => {
  it('provides a complete, actionable Sales Demo tutorial', () => {
    const html = renderToStaticMarkup(createElement(SalesDemoTutorial, { onNavigate: () => {}, onStart: () => {} }))
    expect(salesDemoTutorialSteps.map(step => step.id)).toEqual(['choose', 'launch', 'present', 'template', 'share', 'monitor', 'finish'])
    expect(html).toContain('Learn the Sales Demo workspace')
    expect(html).toContain('Your first safe rehearsal')
    expect(html).toContain('Create and save a reusable starting point')
    expect(html).toContain('Create a self-guided link or QR code')
    expect(html).toContain('Annotated preview of the Sales Demo Home page')
    expect(html).toContain('Essentials → Demo outline → Featured story → Supporting data → Preview &amp; publish')
    expect(html).toContain('choose <strong>Presenter-led</strong> in the Type filter')
    expect(html).toContain('<strong>Open this screen</strong>')
    expect(html).toContain("Only presenter-led sessions offer <strong>Open this screen</strong>")
    expect(html).toContain('Prospect sessions can still receive safe synthetic events from the founder workspace')
    expect(html).toContain('Annotated preview of the Live demos monitoring view')
    expect(html).toContain('Select <strong>End</strong>, then confirm with <strong>End demo</strong>')
    expect(html).toContain('filter by demo type, session status, role, template, shared link, presenter, or date')
    expect(html).toContain('saved follow-up is also added to CRM automatically')
    expect(html).not.toContain('Open guest view')
    expect(html).not.toContain('Outline → Story data')
    expect((html.match(/Mark complete/g) || [])).toHaveLength(salesDemoTutorialSteps.length)
  })

  it('describes presenter-led notes separately from practice notes', () => {
    const html = readFileSync(resolve(process.cwd(), 'pages/app/sales-demo.js'), 'utf8')
    expect(html).toContain('Presenter note saved to this demo.')
    expect(html).toContain('Presenter notes stay with this controlled demo for review in History')
  })

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
    const telemetry = salesDemoTelemetry('launcher.completed', 1200)
    expect(telemetry.payload).toMatchObject({
      url: '/sales-demos/telemetry',
      method: 'post',
      data: { metric: 'launcher.completed', duration_ms: 1200 },
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
    const requested = salesDemoReducer(undefined, { type: 'salesDemos/summaryRequested' })
    expect(requested.loadingByResource.summary).toBe(true)
    expect(requested.loadingByResource.sessions).toBe(false)
    const succeeded = salesDemoReducer(requested, { type: 'salesDemos/summaryReceived', payload: { data: { counts: { active_prospects: 2 } } } })
    expect(succeeded.loadingByResource.summary).toBe(false)
    expect(succeeded.summary.counts.active_prospects).toBe(2)
    const failed = salesDemoReducer(requested, { type: 'salesDemos/summaryFailed', payload: { error: { code: 'VERSION_CONFLICT', message: 'Refresh first' } } })
    expect(failed.loadingByResource.summary).toBe(false)
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
