import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ProductionStageForm from '../components/app/ProductionStageForm'
import { productionStageChoices } from '../components/app/productionStageChoices'

const stage = (id, owner = 'supplier', skippable = false) => ({ id, key: id, label: id.replaceAll('_', ' '), owner, skippable })
const route = custom => ({ stages: [stage('assigned', 'system'), stage('accepted'), stage('material_ordered'), stage('material_received'), stage('programming'), stage('first_article_inspection'), stage('first_article_approved', 'oem'), stage('in_production'), ...custom, { ...stage('inspection'), label: 'Final inspection' }, stage('ready_to_ship'), stage('shipped'), stage('delivered', 'oem')] })
const record = (step, extra = {}) => ({ id: 'test-record', version: 2, current_stage: step, current_workflow_step_id: step, ...extra })
const render = (workflow, item, actorType = 'supplier') => renderToStaticMarkup(React.createElement(ProductionStageForm, { workflow, record: item, actorType, onSubmit: () => {} }))

describe('Production stage advancement', () => {
  it.each([
    ['VLK-2001', route([]), 'in_production', 'inspection', 'Final inspection'],
    ['VLK-3001', route([stage('secondary_inspection'), stage('heat_treatment'), { ...stage('secondary_machining'), label: 'Secondary machining' }]), 'heat_treatment', 'secondary_machining', 'Secondary machining'],
  ])('defaults %s to the immediate forward step instead of the earliest historical stage', (part, workflow, current, nextId, nextLabel) => {
    const item = record(current, { part_number: part })
    const choices = productionStageChoices(workflow, item, 'supplier')
    expect(choices.advance.id).toBe(nextId)
    expect(choices.skips).toEqual([])
    expect(choices.backward.map(step => step.id)).toContain('material_ordered')
    expect(choices.backward.map(step => step.id)).not.toContain('first_article_approved')
    const html = render(workflow, item)
    expect(html).toContain(`value="${nextId}" selected=""`)
    expect(html).toContain(`${nextLabel} — Next stage`)
    expect(html).toContain(`Advance to ${nextLabel}`)
    expect(html.indexOf(`${nextLabel} — Next stage`)).toBeLessThan(html.indexOf('Return to an earlier stage'))
    expect(html).toContain('Optional reason')
    expect(html).not.toContain('Required explanation')
  })

  it('offers only optional skips and never jumps over a required stage', () => {
    const workflow = { stages: [stage('assigned', 'system'), stage('accepted'), stage('material_ordered', 'supplier', true), stage('material_received', 'supplier', true), stage('in_production'), stage('inspection')] }
    const choices = productionStageChoices(workflow, record('accepted'), 'supplier')
    expect(choices.advance.id).toBe('material_ordered')
    expect(choices.skips.map(step => step.id)).toEqual(['material_received', 'in_production'])
    expect(choices.backward).toEqual([])
    expect(render(workflow, record('accepted'))).toContain('Skip optional stages — explanation required')
  })

  it('identifies repeated custom stages by step ID, retaining the correct next occurrence', () => {
    const workflow = route([stage('heat_treatment'), stage('secondary_machining'), { ...stage('heat_treatment-2'), key: 'heat_treatment' }])
    const first = productionStageChoices(workflow, record('heat_treatment'), 'supplier')
    const second = productionStageChoices(workflow, record('heat_treatment', { current_workflow_step_id: 'heat_treatment-2' }), 'supplier')
    expect(first.advance.id).toBe('secondary_machining')
    expect(second.advance.id).toBe('inspection')
    expect(second.backward.map(step => step.id)).toContain('heat_treatment')
  })

  it('shows an OEM-owned next step without selecting a supplier rollback or bypassing the approval', () => {
    const workflow = route([])
    const item = record('first_article_inspection')
    const choices = productionStageChoices(workflow, item, 'supplier')
    expect(choices.next.id).toBe('first_article_approved')
    expect(choices.advance).toBeNull()
    expect(choices.skips).toEqual([])
    const html = render(workflow, item)
    expect(html).toContain('OEM action')
    expect(html).toContain('value="" disabled="" selected=""')
    expect(html).toContain('type="submit" disabled=""')
  })

  it('does not preselect a backward move at receiving, or invent a route for an unknown current step', () => {
    const workflow = route([])
    expect(productionStageChoices(workflow, record('shipped'), 'supplier').advance).toBeNull()
    expect(render(workflow, record('shipped'))).toContain('value="" disabled="" selected=""')
    const unknown = productionStageChoices(workflow, record('missing-step'), 'supplier')
    expect(unknown).toMatchObject({ advance: null, skips: [], backward: [] })
    expect(render(workflow, record('missing-step'))).toContain('No next stage is available.')
  })

  it('supports older records without step IDs and keeps the shipping date required', () => {
    const workflow = route([])
    const item = record('ready_to_ship', { current_workflow_step_id: undefined })
    expect(productionStageChoices(workflow, item, 'supplier').advance.id).toBe('shipped')
    const html = render(workflow, item)
    expect(html).toContain('Shipment date')
    expect(html).toMatch(/<input[^>]*id="shipment-date"[^>]*required=""/)
  })
})
