import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ProductionRecordCard from '../components/app/ProductionRecordCard'
import ProductionCardProgress from '../components/app/ProductionCardProgress'

const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props))
const record = {
  id: 'record-a', public_reference: 'VK-CARD-001', part_name: 'Old name', part_number: 'OLD', current_stage: 'paint', lifecycle_state: 'active', schedule_health: 'on_schedule',
  supplier_organization: { name: 'Precision Supplier' }, oem_organization: { name: 'Aircraft OEM' },
  required_delivery_date: '2026-10-31T00:00:00Z', expected_ship_date: null, last_supplier_update_at: null,
  active_attention_codes: ['TECHNICAL_REVIEW_ACTION', 'MISSING_EXPECTED_SHIP_DATE'],
  card_presentation: { identity: { name: 'Flight Control Bell Crank', part_number: 'VLK-5001', revision: 'A' }, progress: { current_label: 'Second paint pass', position: 10, total: 17 } },
}

describe('Production card presentation', () => {
  it('puts the frozen name before secondary identifiers and keeps dates, badges and attention visible', () => {
    const html = render(ProductionRecordCard, { record, organizationType: 'oem' })
    expect(html).toContain('<h3>Flight Control Bell Crank</h3>')
    expect(html.indexOf('Flight Control Bell Crank')).toBeLessThan(html.indexOf('VLK-5001'))
    expect(html.indexOf('VLK-5001')).toBeLessThan(html.indexOf('VK-CARD-001'))
    for (const text of ['Precision Supplier', 'Rev A', 'On schedule', 'Required arrival', 'Expected ship', 'Last supplier update', 'Oct 31, 2026', 'Not available', 'Second paint pass', 'Stage 10 of 17', 'TECHNICAL REVIEW ACTION', 'MISSING EXPECTED SHIP DATE']) expect(html).toContain(text)
    expect(html).toContain('href="/app/production/record-a"')
    expect(html).not.toContain('Old name')
    expect(html.indexOf('Attention required')).toBeGreaterThan(html.indexOf('productionCard__open'))
  })
  it('supports older API responses and an unlinked record without fabricated progress', () => {
    const html = render(ProductionRecordCard, { record: { id: 'legacy', part_number: 'LEGACY-42', current_stage: 'assigned' }, organizationType: 'supplier' })
    expect(html).toContain('<h3>LEGACY-42</h3>')
    expect(html).toContain('No preview')
    expect(html).toContain('OEM customer')
    expect(html).not.toContain('Stage 1 of')
    expect(html).not.toContain('productionCard__track')
  })
  it('retains company context, protected/blocked labels and long attention in compact cards', () => {
    const html = render(ProductionRecordCard, { record: { ...record, export_control: 'itar', active_production_block_count: 1 }, organizationType: 'supplier', compact: true })
    for (const text of ['productionCard--compact', 'Aircraft OEM', 'Protected image', 'ITAR', 'Production blocked', 'TECHNICAL REVIEW ACTION', 'Last supplier update']) expect(html).toContain(text)
    expect(html).not.toContain('<img')
  })
  it('distinguishes completed, cancelled, archived and unknown positions', () => {
    for (const [state, label] of [['completed', 'Production completed'], ['cancelled', 'Production cancelled'], ['archived', 'Production archived'], ['draft', 'Not yet assigned']]) {
      const html = render(ProductionCardProgress, { progress: record.card_presentation.progress, lifecycleState: state })
      expect(html).toContain(label)
      expect(html).not.toContain('Stage 10 of 17')
      if (state !== 'completed') expect(html).not.toContain('productionCard__track')
    }
    const html = render(ProductionCardProgress, { progress: { position: null, total: 17 }, currentStage: 'paint', lifecycleState: 'active' })
    expect(html).toContain('Paint')
    expect(html).not.toContain('productionCard__track')
  })
})
