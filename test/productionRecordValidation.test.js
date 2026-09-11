import { describe, expect, it } from 'vitest'
import { productionErrorTarget, productionServerIssues, validateProductionForm } from '../components/app/productionRecordValidation'

const complete = { part_number: 'VLK-5001', part_name: 'Forged ring gear', po_number: 'Test', quantity: '20', unit: 'each', required_delivery_date: '2026-10-31', supplier_organization_id: 'supplier' }

describe('actionable production form validation', () => {
  it('identifies the two missing commitments from the reported review screen', () => {
    const errors = validateProductionForm({ ...complete, quantity: '', required_delivery_date: '' })
    expect(errors).toEqual({ quantity: 'Quantity is required', required_delivery_date: 'Required arrival date is required' })
    expect(productionErrorTarget('quantity')).toEqual({ id: 'production-quantity', step: 2, label: 'Quantity' })
    expect(productionErrorTarget('required_delivery_date')?.id).toBe('production-required-date')
  })
  it('allows incomplete private drafts while rejecting invalid entered values', () => {
    expect(validateProductionForm({}, 'draft')).toEqual({})
    expect(validateProductionForm({ quantity: '-1', transit_days: '1.5' }, 'draft')).toHaveProperty('quantity')
    expect(validateProductionForm({ quantity: '-1', transit_days: '1.5' }, 'draft')).toHaveProperty('transit_days')
  })
  it.each(['0', '-4', '1000000001', 'not a number'])('explains invalid quantity %s', quantity => {
    expect(validateProductionForm({ ...complete, quantity })).toHaveProperty('quantity')
  })
  it('accepts valid fractional quantities and inclusive limits', () => {
    expect(validateProductionForm({ ...complete, quantity: '0.0000001', transit_days: '0' })).toEqual({})
    expect(validateProductionForm({ ...complete, quantity: '1000000000', transit_days: '365' })).toEqual({})
  })
  it('rejects nonexistent calendar dates, blank required text, and missing custom units', () => {
    expect(validateProductionForm({ ...complete, required_delivery_date: '2026-02-30', po_number: '  ', unit: 'other' })).toMatchObject({ required_delivery_date: expect.any(String), po_number: expect.any(String), unit_other: expect.any(String) })
    expect(validateProductionForm({ ...complete, required_delivery_date: '2028-02-29' })).toEqual({})
  })
  it('maps controlled and conditional fields to an editable control', () => {
    expect(productionErrorTarget('part_number', { part_revision_id: 'released' })?.id).toBe('production-part-workspace')
    expect(productionErrorTarget('unit_other', { unit: 'each' })?.id).toBe('production-unit')
    expect(productionErrorTarget('first_article_note', { first_article_required: false })?.id).toBe('production-first-article-required')
    expect(productionErrorTarget('workflow_configuration.custom_process_stages')?.id).toBe('production-workflow')
  })
  it('preserves server field explanations and unknown errors without inventing destinations', () => {
    expect(productionServerIssues({ type: 'error', message: 'Invalid production record', details: { quantity: 'Quantity is required', body: 'Refresh and try again' } })).toEqual({ fields: { quantity: 'Quantity is required' }, general: ['Refresh and try again'] })
    expect(productionServerIssues({ type: 'error', code: 'RELATIONSHIP_REQUIRED', message: 'Select an active connected supplier' }).fields).toHaveProperty('supplier_organization_id')
    expect(productionServerIssues({ type: 'error', message: 'Connection interrupted' }).general).toEqual(['Connection interrupted'])
    expect(productionErrorTarget('unknown')).toBeNull()
  })
  it('clears an issue when its value is corrected without removing other issues', () => {
    const form = { ...complete, quantity: '', required_delivery_date: '' }
    expect(validateProductionForm({ ...form, quantity: '12' })).toEqual({ required_delivery_date: 'Required arrival date is required' })
  })
})
