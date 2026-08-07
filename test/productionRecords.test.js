import { describe, expect, it } from 'vitest'
import reducer from '../store/reducer'
import { organizationSwitchRequested } from '../store/slices/appContext'
import { machineAssignmentsReceived } from '../store/slices/entities/machineAssignments'
import { productionEventsReceived } from '../store/slices/entities/productionEvents'
import { productionRecordSelectors } from '../store/slices/entities/productionRecords'
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
