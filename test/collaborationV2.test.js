import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { commandData, FORMAL_V2, isFormalV2, workflowError } from '../store/collaborationV2'
import { DataSummary, FormalDetail, TechnicalAcceptance } from '../components/app/FormalEscalationPanel'
import { FormalActionForm, FormalCreationForm } from '../components/app/FormalEscalationForms'

const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props))
describe('Collaboration V2 client contracts', () => {
  it('keeps retry identity stable while separating changed versions, payloads and aggregates', () => {
    const first = commandData('one', 'submit_resolution', 2, { data: { reason: 'Verified correction', summary: 'Proposed correction' } })
    expect(commandData('one', 'submit_resolution', 2, { data: { summary: 'Proposed correction', reason: 'Verified correction' } }).idempotency_key).toBe(first.idempotency_key)
    expect(commandData('one', 'submit_resolution', 3, { data: {} }).idempotency_key).not.toBe(first.idempotency_key)
    expect(commandData('two', 'submit_resolution', 2, { data: {} }).idempotency_key).not.toBe(first.idempotency_key)
    expect(commandData('one', 'submit_resolution', 2, { data: { summary: 'Revised correction' } }).idempotency_key).not.toBe(first.idempotency_key)
  })
  it('reads the public nested workflow version and retains stale drafts', () => {
    expect(isFormalV2({ workflow: { version: FORMAL_V2 } })).toBe(true)
    expect(isFormalV2({ workflow_version: FORMAL_V2 })).toBe(true)
    expect(isFormalV2({ workflow: { version: 'attention-workflow-v1' } })).toBe(false)
    expect(workflowError({ error: { code: 'VERSION_CONFLICT' } })).toContain('Your draft is saved here')
  })
  it('offers exactly the three explicit formal categories', () => {
    const html = render(FormalCreationForm, { record: { id: 'record', quantity: 20 }, version: 0, organizationType: 'oem', relatedRecords: [], formalRecords: [] })
    expect(html.match(/type="radio"/g)).toHaveLength(3)
    for (const label of ['Issue', 'Production Block', 'Non-Conformance']) expect(html).toContain(label)
    expect(html).not.toContain('Information Flag')
  })
  it('shows permanent closure and hides creation controls from read-only roles', () => {
    const item = { id: 'formal', category: 'non_conformance', active: false, workflow: { version: FORMAL_V2, terminal: true, current_actor_side: 'none', history: [], data: { affected_scope: { affected_quantity: 3, produced_quantity: 20 } } } }
    const html = render(FormalDetail, { item, context: {}, files: [], record: { public_reference: 'VK-TEST', quantity: 20 }, canCreate: false })
    expect(html).toContain('permanently closed')
    expect(html).toContain('3 affected')
    expect(html).not.toContain('Create a related formal record')
    expect(html).not.toContain('Start a new case referencing this record')
    expect(html).not.toContain('Add message')
  })
  it('keeps an unavailable action draft readable while disabling its submission', () => {
    const html = render(FormalActionForm, { item: { version: 4, workflow: { data: { resolution: { summary: 'Retained supplier proposal', reason: 'Retained supporting rationale' } } } }, action: { key: 'submit_resolution', label: 'Submit resolution', data_kind: 'resolution' }, unavailable: true })
    expect(html).toContain('Retained supplier proposal')
    expect(html).toContain('draft is preserved')
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/)
  })
  it('renders production-only approval, named investigation ownership, and legacy history', () => {
    const accepted = render(TechnicalAcceptance, { acceptance: { change: { original_condition: 'Original drawing condition', accepted_change: 'Accepted synthetic process', effectivity: 'This lot only' }, approval: { actor: { display_name: 'OEM reviewer' }, occurred_at: '2026-09-07T12:00:00Z' } } })
    expect(accepted).toContain('Accepted for this production only')
    expect(accepted).toContain('OEM reviewer')
    expect(render(DataSummary, { data: { investigation: { owner_membership_id: 'member' } }, participants: [{ id: 'member', name: 'Synthetic investigator' }] })).toContain('Synthetic investigator')
    const legacy = render(FormalDetail, { item: { id: 'legacy', explanation: 'Previous decision', active: false, workflow: { history: [] } }, context: {}, record: {}, files: [] })
    expect(legacy).toContain('Legacy history · read-only')
    expect(legacy).toContain('Previous decision')
  })
})
