import { describe, expect, it } from 'vitest'
import reducer from '../store/reducer'
import { organizationSwitchRequested } from '../store/slices/appContext'
import { platformSelectors, trackProductEvent } from '../store/slices/entities/platformAdministration'

describe('platform administration state', () => {
  it('stores bounded platform results and clears them before a company switch', () => {
    let state = reducer(undefined, { type: '@@init' })
    state = reducer(state, { type: 'platformAdministration/summaryReceived', payload: { data: { organizations: { total: 4 } } } })
    state = reducer(state, {
      type: 'platformAdministration/usersReceived',
      payload: { data: { memberships: [{ id: 'membership-a' }] }, meta: { page: 1, total: 1 } },
    })
    state = reducer(state, {
      type: 'platformAdministration/detailReceived',
      payload: { data: { organization: { id: 'organization-a', name: 'OEM A' }, support_access: { mode: 'read_only' } } },
    })

    expect(platformSelectors.getSummary(state).organizations.total).toBe(4)
    expect(platformSelectors.getUsers(state)).toMatchObject({ items: [{ id: 'membership-a' }], pagination: { page: 1, total: 1 } })
    expect(platformSelectors.getOrganizationDetail('organization-a')(state).support_access.mode).toBe('read_only')

    state = reducer(state, organizationSwitchRequested('organization-b'))
    expect(platformSelectors.getSummary(state)).toBe(null)
    expect(platformSelectors.getUsers(state).items).toEqual([])
    expect(platformSelectors.getOrganizationDetail('organization-a')(state)).toBe(null)
  })

  it('creates a content-free first-party instrumentation request', () => {
    const action = trackProductEvent('production.detail_viewed', 'production_detail')
    expect(action.type).toBe('api/callBegan')
    expect(action.payload).toMatchObject({
      url: '/product-events',
      method: 'post',
      data: { event_name: 'production.detail_viewed', surface: 'production_detail' },
      organizationScoped: true,
    })
    expect(Object.keys(action.payload.data)).toEqual(['event_name', 'surface'])
  })
})
