import { describe, expect, it } from 'vitest'
import reducer from '../store/reducer'
import appContextReducer, {
  deriveContextStatus,
  organizationContextReceived,
  organizationSwitchRequested,
  experienceSwitchRequested,
} from '../store/slices/appContext'

const activeContext = {
  memberships: [
    {
      id: 'membership-a',
      role: 'oem_admin',
      status: 'active',
      organization: { id: 'organization-a', name: 'OEM A', type: 'oem', status: 'active' },
    },
  ],
  active_organization: { id: 'organization-a', name: 'OEM A', type: 'oem', status: 'active' },
  active_membership: { id: 'membership-a', role: 'oem_admin', status: 'active' },
  experience: null,
  available_experiences: [],
  permissions: ['organization.read', 'membership.read'],
}

describe('organization context', () => {
  it('derives each no-access state without treating it as a ready workspace', () => {
    expect(deriveContextStatus(activeContext)).toBe('ready')
    expect(deriveContextStatus({ ...activeContext, user: { account_status: 'suspended' } })).toBe('account_suspended')
    expect(deriveContextStatus({ memberships: [{ status: 'invited', organization: { status: 'active' } }] })).toBe('invitation_pending')
    expect(deriveContextStatus({ memberships: [{ status: 'suspended', organization: { status: 'active' } }] })).toBe('membership_suspended')
    expect(deriveContextStatus({ memberships: [{ status: 'active', organization: { status: 'suspended' } }] })).toBe('organization_suspended')
    expect(deriveContextStatus({ memberships: [] })).toBe('no_membership')
  })

  it('hydrates snake-case session data returned by the API', () => {
    const state = appContextReducer(undefined, organizationContextReceived({ data: activeContext }))
    expect(state.status).toBe('ready')
    expect(state.activeOrganization.id).toBe('organization-a')
    expect(state.activeMembership.role).toBe('oem_admin')
    expect(state.permissions).toContain('membership.read')
  })

  it('clears tenant-owned normalized data as soon as a switch begins', () => {
    let state = reducer(undefined, { type: '@@init' })
    state = reducer(state, organizationContextReceived({ data: activeContext }))
    state = reducer(state, {
      type: 'relationships/listReceived',
      payload: { data: { relationships: [{ id: 'relationship-a', status: 'active' }] } },
    })
    expect(state.entities.relationships.ids).toEqual(['relationship-a'])

    const previousVersion = state.appContext.contextVersion
    state = reducer(state, organizationSwitchRequested('organization-b'))

    expect(state.entities.relationships.ids).toEqual([])
    expect(state.appContext.activeOrganization.id).toBe('organization-a')
    expect(state.appContext.switching).toBe(true)
    expect(state.appContext.contextVersion).toBe(previousVersion + 1)
  })

  it('hydrates founder experiences and clears cached records before changing access', () => {
    const founderContext = {
      ...activeContext,
      active_organization: { id: 'organization-v', name: 'Velakron', type: 'velakron', status: 'active' },
      active_membership: { id: 'membership-v', role: 'founder', assigned_role: 'founder', status: 'active' },
      experience: 'founder',
      available_experiences: ['founder', 'velakron_admin'],
      permissions: ['crm.dashboard.read'],
    }
    let state = reducer(undefined, { type: '@@init' })
    state = reducer(state, organizationContextReceived({ data: founderContext }))
    state = reducer(state, {
      type: 'organizations/listReceived',
      payload: { data: { organizations: [{ id: 'private-crm-record', name: 'Private CRM record' }] } },
    })
    expect(state.appContext.experience).toBe('founder')
    expect(state.appContext.availableExperiences).toEqual(['founder', 'velakron_admin'])
    expect(state.entities.organizations.ids).toEqual(['private-crm-record'])

    state = reducer(state, experienceSwitchRequested('velakron_admin'))
    expect(state.entities.organizations.ids).toEqual([])
    expect(state.appContext.switchingExperience).toBe(true)
    expect(state.appContext.switchingToExperience).toBe('velakron_admin')
  })
})
