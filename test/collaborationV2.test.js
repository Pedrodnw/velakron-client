import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { commandData, FORMAL_V2, isFormalV2, workflowError } from '../store/collaborationV2'
import { DataSummary, FormalDetail, TechnicalAcceptance } from '../components/app/FormalEscalationPanel'
import { EvidenceSelect, FormalActionForm, FormalCreationForm } from '../components/app/FormalEscalationForms'
import ConfirmationDialog from '../components/app/ConfirmationDialog'

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
  it('labels the primary and additional affected Production Records and makes the other record navigable', () => {
    const item = { id: 'formal', category: 'production_block', explanation: 'Stop both linked records.', workflow: { version: FORMAL_V2, terminal: false, current_actor_side: 'supplier', history: [], data: {} } }
    const detail = { affected_production_records: [
      { id: 'primary', public_reference: 'VK-PRIMARY', part_number: 'VLK-100', primary: true },
      { id: 'related', public_reference: 'VK-RELATED', part_number: 'VLK-100', primary: false },
    ] }
    const html = render(FormalDetail, { item, detail, context: {}, files: [], record: { id: 'primary', public_reference: 'VK-PRIMARY' }, onProduction: () => {} })
    expect(html).toContain('Affected production records')
    expect(html).toContain('Primary production record · Part VLK-100')
    expect(html).toContain('Additional affected production record · Part VLK-100')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('aria-label="Open affected production record VK-RELATED"')
  })
  it('keeps an unavailable action draft readable while disabling its submission', () => {
    const html = render(FormalActionForm, { item: { version: 4, workflow: { data: { resolution: { summary: 'Retained supplier proposal', reason: 'Retained supporting rationale' } } } }, action: { key: 'submit_resolution', label: 'Submit resolution', data_kind: 'resolution' }, unavailable: true })
    expect(html).toContain('Retained supplier proposal')
    expect(html).toContain('draft is preserved')
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/)
  })
  it('explains unknown scope without implying that any quantity is unaffected', () => {
    const item = { id: 'formal', production_record: 'primary', category: 'non_conformance', workflow: { version: FORMAL_V2, state: 'supplier_scope_required', current_actor_side: 'supplier', data: {} } }
    const html = render(FormalDetail, { item, context: {}, files: [], record: { id: 'primary', quantity: 50 } })
    expect(html).toContain('Affected parts awaiting supplier confirmation')
    expect(html).not.toContain('outside the reported scope')
    expect(html).not.toContain('NaN')
    const form = render(FormalActionForm, { item, record: { quantity: 50 }, action: { key: 'submit_affected_scope', label: 'Confirm affected parts', data_kind: 'affected_scope' } })
    expect(form).toContain('Production quantity: 50')
    expect(form).toContain('Affected quantity')
    expect(form).toContain('Lot (optional)')
    expect(form).toMatch(/type="number"[^>]*required=""[^>]*min="1"/)
  })
  it('uses primary production scope when showing the formal record from another production', () => {
    const item = { id: 'formal', category: 'non_conformance', workflow: { version: FORMAL_V2, data: { affected_scope: { affected_quantity: 3 } } } }
    const html = render(FormalDetail, { item, detail: { affected_production_records: [{ id: 'primary', quantity: 20, primary: true }] }, context: {}, files: [], record: { id: 'related', quantity: 100 } })
    expect(html).toContain('17 outside the reported scope')
    expect(html).not.toContain('97 outside')
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
  it('keeps return instructions visible after comments and removes the notice after resubmission', () => {
    const returned = { action: 'return_resolution', from_state: 'awaiting_oem_resolution_approval', to_state: 'supplier_resolution_required', note: 'Specify the lot and independent inspection method.' }
    const item = { id: 'formal', category: 'issue', workflow: { version: FORMAL_V2, state: returned.to_state, history: [returned, { action: 'add_message', from_state: returned.to_state, to_state: returned.to_state, note: 'Acknowledged.' }] } }
    const props = { item, context: {}, files: [], record: {} }
    expect(render(FormalDetail, props)).toContain('aria-label="Requested changes"')
    item.workflow.state = 'awaiting_oem_resolution_approval'
    item.workflow.history.push({ action: 'submit_resolution', from_state: returned.to_state, to_state: item.workflow.state })
    expect(render(FormalDetail, props)).not.toContain('aria-label="Requested changes"')
  })
  it('gives nested confirmations independent accessible names and an explicit safe exit', () => {
    const html = renderToStaticMarkup(React.createElement(React.Fragment, null,
      React.createElement(ConfirmationDialog, { open: true, title: 'Parent confirmation' }),
      React.createElement(ConfirmationDialog, { open: true, title: 'Discard draft?', cancelLabel: 'Keep editing', confirmLabel: 'Discard draft', danger: true }),
    ))
    const ids = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map(match => match[1])
    expect(new Set(ids).size).toBe(2)
    expect(html).toContain('Keep editing')
    expect(html).toContain('vk-button--danger')
  })
  it('directs evidence uploads to the relevant source and keeps optional links compact', () => {
    expect(render(EvidenceSelect, {})).toContain('Documents or Photos')
    expect(render(EvidenceSelect, { emptyHint: 'Attach evidence to the source conversation before escalating.' })).toContain('source conversation')
    const props = { record: {}, organizationType: 'oem', formalRecords: [{ id: 'related', category: 'issue', explanation: 'Existing issue' }] }
    expect(render(FormalCreationForm, props)).toMatch(/<details class="formalV2__links"><summary>Link other records/)
    expect(render(FormalCreationForm, { ...props, defaultRelatedFormal: 'related' })).toMatch(/<details class="formalV2__links" open=""/)
  })
})
