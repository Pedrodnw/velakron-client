import { describe, expect, it, vi } from 'vitest'
import { ATTENTION_CATEGORIES, attentionCategoryFor } from '../components/app/attentionCategories'
import reducer from '../store/reducer'
import { organizationSwitchRequested } from '../store/slices/appContext'
import { machineAssignmentsReceived } from '../store/slices/entities/machineAssignments'
import { productionEventsReceived } from '../store/slices/entities/productionEvents'
import {
  findFirstNonEmptySupplierProductionView,
  productionRecordSelectors,
} from '../store/slices/entities/productionRecords'
import { productionCollaborationSelectors } from '../store/slices/entities/productionCollaboration'
import { supplierAssignmentsReceived } from '../store/slices/entities/supplierAssignments'

const detailPayload = {
  data: {
    record: {
      id: 'production-a',
      public_reference: 'VK-2026-ABC234',
      version: 3,
      lifecycle_state: 'active',
      current_stage: 'accepted',
    },
    assignments: [{ id: 'supplier-assignment-a', sequence: 1 }],
    machine_assignments: [{ id: 'machine-assignment-a', status: 'active' }],
    timeline: [{ id: 'event-a', event_type: 'supplier_assignment.accepted' }],
    actions: { transition: true, assign_machine: true },
    workflow: { version: 'production-v1', stages: [{ key: 'assigned' }, { key: 'accepted' }] },
  },
}

describe('production record state', () => {
  it('selects the first non-empty supplier view without probing the empty current view again', async () => {
    const totals = { active: 0, action_required: 0, completed: 4 }
    const dispatch = vi.fn(action => Promise.resolve({
      ok: true,
      payload: { data: { records: [] }, meta: { total: totals[action.payload.params.view] } },
    }))

    const fallback = await findFirstNonEmptySupplierProductionView('action_required')(dispatch)

    expect(fallback).toBe('completed')
    expect(dispatch.mock.calls.map(([action]) => action.payload.params.view)).toEqual(['active', 'completed'])
  })

  it('stops supplier view selection as soon as Active Parts has records', async () => {
    const dispatch = vi.fn(action => Promise.resolve({
      ok: true,
      payload: { data: { records: [{ id: 'production-a' }] }, meta: { total: 1 } },
    }))

    const fallback = await findFirstNonEmptySupplierProductionView('action_required')(dispatch)

    expect(fallback).toBe('active')
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('presents the approved attention categories and fixed risk labels', () => {
    expect(ATTENTION_CATEGORIES.map(item => item.value)).toEqual([
      'non_conformance',
      'production_block',
      'issue',
      'information_flag',
    ])
    expect(attentionCategoryFor('non_conformance')).toMatchObject({ riskLabel: 'High risk', tone: 'danger' })
    expect(attentionCategoryFor('information_flag')).toMatchObject({ riskLabel: 'No schedule risk', tone: 'info' })
  })

  it('normalizes detail data while retaining the workflow and allowed actions', () => {
    let state = reducer(undefined, { type: '@@init' })
    state = reducer(state, { type: 'productionRecords/detailReceived', payload: detailPayload })

    expect(productionRecordSelectors.getRecordById('production-a')(state)).toMatchObject({
      public_reference: 'VK-2026-ABC234',
      version: 3,
    })
    expect(productionRecordSelectors.getDetailById('production-a')(state)).toMatchObject({
      actions: { transition: true, assign_machine: true },
      timeline: [{ id: 'event-a', event_type: 'supplier_assignment.accepted' }],
    })
    expect(productionRecordSelectors.getWorkflow(state).version).toBe('production-v1')
  })

  it('normalizes immutable production histories and clears them before a tenant switch', () => {
    let state = reducer(undefined, { type: '@@init' })
    state = reducer(state, { type: 'productionRecords/detailReceived', payload: detailPayload })
    state = reducer(state, supplierAssignmentsReceived(detailPayload.data.assignments))
    state = reducer(state, machineAssignmentsReceived(detailPayload.data.machine_assignments))
    state = reducer(state, productionEventsReceived(detailPayload.data.timeline))

    expect(state.entities.supplierAssignments.ids).toEqual(['supplier-assignment-a'])
    expect(state.entities.machineAssignments.ids).toEqual(['machine-assignment-a'])
    expect(state.entities.productionEvents.ids).toEqual(['event-a'])

    state = reducer(state, organizationSwitchRequested('organization-b'))

    expect(state.entities.productionRecords.ids).toEqual([])
    expect(state.entities.productionRecords.detailsById).toEqual({})
    expect(state.entities.supplierAssignments.ids).toEqual([])
    expect(state.entities.machineAssignments.ids).toEqual([])
    expect(state.entities.productionEvents.ids).toEqual([])
  })

  it('keeps timeline, notes, files, attention, and upload state scoped to one production record', () => {
    let state = reducer(undefined, { type: '@@init' })
    state = reducer(state, {
      type: 'productionCollaboration/recordReceived',
      payload: {
        id: 'production-a',
        timeline: { events: [{ id: 'event-a', sequence: 1 }], page: { has_more: false } },
        notes: { notes: [{ id: 'note-a', visibility: 'shared' }] },
        attachments: { attachments: [{ id: 'file-a', state: 'available' }] },
        attention: { conditions: [{ id: 'attention-a', code: 'STALE_SUPPLIER_UPDATE' }], health: 'needs_attention', highest_severity: 'medium' },
      },
    })
    const collaboration = productionCollaborationSelectors.getRecord('production-a')(state)
    expect(collaboration.timeline).toEqual([{ id: 'event-a', sequence: 1 }])
    expect(collaboration.notes[0].visibility).toBe('shared')
    expect(collaboration.attachments[0].state).toBe('available')
    expect(collaboration.health).toBe('needs_attention')

    state = reducer(state, organizationSwitchRequested('organization-b'))
    expect(state.entities.productionCollaboration.byRecord).toEqual({})
  })
})
