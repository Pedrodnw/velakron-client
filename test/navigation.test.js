import { describe, expect, it } from 'vitest'
import { getNavigationItems } from '../components/app/navigation'

const labels = (type, permissions) => getNavigationItems(type, permissions).map(item => item.label)

describe('role-aware application navigation', () => {
  it('shows OEM workflows and hides actions outside the effective permission set', () => {
    expect(labels('oem', ['production_record.read', 'relationship.read', 'membership.read']))
      .toEqual(['Overview', 'Production', 'Suppliers', 'Team', 'Account'])
    expect(labels('oem', ['production_record.read', 'relationship.read']))
      .toEqual(['Overview', 'Production', 'Suppliers', 'Account'])
  })

  it('shows supplier-specific work, machines, and company profile navigation', () => {
    expect(labels('supplier', [
      'production_record.read',
      'machine.read',
      'supplier_profile.read',
      'relationship.read',
      'organization.read',
      'membership.read',
    ])).toEqual(['Overview', 'Onboarding & profile', 'Facilities', 'Production', 'Machines', 'Certifications', 'Customers', 'Team', 'Account'])

    expect(labels('supplier', [
      'machine.read',
      'supplier_profile.read',
      'relationship.read',
      'membership.read',
    ])).toEqual(['Overview', 'Onboarding & profile', 'Facilities', 'Machines', 'Certifications', 'Customers', 'Team', 'Account'])
  })

  it('shows audited platform areas only in a permitted Velakron context', () => {
    expect(labels('velakron', ['platform.support', 'audit.read', 'membership.read']))
      .toEqual(['Overview', 'Action center', 'Internal team', 'Organizations', 'Users', 'Relationships', 'Audit & support', 'Account'])
    expect(labels('velakron', ['platform.support', 'supplier_profile.review', 'audit.read', 'membership.read']))
      .toEqual(['Overview', 'Action center', 'Internal team', 'Organizations', 'Users', 'Supplier reviews', 'Relationships', 'Audit & support', 'Account'])
    expect(labels('velakron', [])).toEqual(['Overview', 'Account'])
  })

  it('gives founders the internal task workspace without platform administration links', () => {
    expect(labels('velakron', ['organization.read', 'internal_task.read', 'trade_show_lead.read', 'dynamic_endpoint.manage']))
      .toEqual(['Overview', 'Tasks & priorities', 'Dynamic Endpoint', 'Account'])
  })

  it('shows CRM navigation only when the founder-only CRM permission is present', () => {
    expect(labels('velakron', ['crm.dashboard.read', 'internal_task.read']))
      .toEqual(['Overview', 'CRM', 'Tasks & priorities', 'Account'])
    expect(labels('velakron', ['platform.support', 'audit.read']))
      .not.toContain('CRM')
  })

  it('keeps IMTS acquisition inside the founder-only CRM instead of the primary workspace navigation', () => {
    expect(labels('velakron', ['crm.dashboard.read', 'trade_show_lead.read']))
      .toEqual(['Overview', 'CRM', 'Account'])
  })

  it('removes account management from temporary IMTS workspaces', () => {
    expect(getNavigationItems('oem', ['production_record.read'], { demoWorkspace: true }).map(item => item.label))
      .toEqual(['Overview', 'Production'])
  })

  it('leaves account management available without an organization context', () => {
    expect(labels(null, [])).toEqual(['Account'])
  })
})
