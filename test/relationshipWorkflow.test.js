import { describe, expect, it } from 'vitest'
import {
  RELATIONSHIP_ACTIONS,
  relationshipActionFor,
  relationshipStatusLabel,
} from '../components/app/relationshipWorkflow'

describe('relationship workflow presentation', () => {
  it('gives a supplier administrator an explicit decision for a pending OEM relationship', () => {
    expect(relationshipActionFor({
      organizationType: 'supplier',
      status: 'pending_supplier',
      canManage: true,
    })).toBe(RELATIONSHIP_ACTIONS.SUPPLIER_DECISION)
    expect(relationshipStatusLabel({
      organizationType: 'supplier',
      status: 'pending_supplier',
    })).toBe('Your approval required')
  })

  it('explains when a supplier member must ask an administrator to decide', () => {
    expect(relationshipActionFor({
      organizationType: 'supplier',
      status: 'pending_supplier',
      canManage: false,
    })).toBe(RELATIONSHIP_ACTIONS.SUPPLIER_ADMIN_REQUIRED)
  })

  it('shows OEM users that the next action belongs to the supplier', () => {
    expect(relationshipActionFor({
      organizationType: 'oem',
      status: 'pending_supplier',
      canManage: true,
    })).toBe(RELATIONSHIP_ACTIONS.WAITING_FOR_SUPPLIER)
    expect(relationshipStatusLabel({
      organizationType: 'oem',
      status: 'pending_supplier',
    })).toBe('Awaiting supplier')
  })
})
