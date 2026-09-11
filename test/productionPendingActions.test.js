import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ProductionRecordCard from '../components/app/ProductionRecordCard'
import ProductionPendingActions from '../components/app/ProductionPendingActions'

const action = { id: 'case:123', source: 'PART_COLLABORATION_ACTION', actor_side: 'oem', label: 'OEM response needed', title: 'Significant warping after heat treatment', href: '/app/production/456?part_tab=cases&collaboration=123' }
const record = { id: '456', part_number: 'VLK-3001', current_stage: 'heat_treatment', schedule_health: 'on_schedule', active_attention_codes: ['PART_COLLABORATION_ACTION'], pending_actions: [action] }
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props))

describe('Pending actions beside the schedule', () => {
  it('keeps On schedule and the exact actionable reason visible together without repeating the generic flag', () => {
    const html = render(ProductionRecordCard, { record, organizationType: 'oem' })
    expect(html).toContain('On schedule')
    expect(html).toContain('OEM response needed: ')
    expect(html).toContain('Significant warping after heat treatment')
    expect(html).toContain('href="/app/production/456?part_tab=cases&amp;collaboration=123"')
    expect(html).not.toContain('PART COLLABORATION ACTION')
  })
  it('renders multiple actions as separate accessible links and safely escapes titles', () => {
    const html = render(ProductionPendingActions, { record: { ...record, pending_actions: [action, { ...action, id: 'case:789', title: '<img src=x onerror=alert(1)>', href: '/app/production/456?collaboration=789' }] } })
    expect(html).toContain('aria-label="Your next actions"')
    expect(html.match(/<li>/g)).toHaveLength(2)
    expect(html).toContain('&lt;img')
    expect(html).not.toContain('<img')
  })
  it('stays empty for older API responses, resolved actions, and locked records', () => {
    for (const item of [{}, { pending_actions: [] }, { ...record, confidentiality_locked: true }]) expect(render(ProductionPendingActions, { record: item })).toBe('')
  })
})
