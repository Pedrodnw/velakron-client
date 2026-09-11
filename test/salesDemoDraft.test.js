import { describe, expect, it } from 'vitest'
import { changedTemplateFields } from '../components/app/sales-demo/templateDraft'

describe('Sales Demo partial draft saves', () => {
  it('keeps an approved-part edit small even when the saved tour is large', () => {
    const saved = { name: 'Full platform', journey_steps: [{ presenter_note: 'Tour context. '.repeat(800) }], production_records: [{ key: 'one', partNumber: 'AST-CRYO-117' }] }
    const next = { ...saved, production_records: [{ key: 'one', partNumber: 'VLK-2001' }] }
    const changes = changedTemplateFields(JSON.stringify(saved), next)
    expect(changes).toEqual({ production_records: next.production_records })
    expect(JSON.stringify(changes).length).toBeLessThan(200)
    expect({ ...saved, ...changes }).toEqual(next)
  })
  it('retains deliberate empty fields and skips unchanged content', () => {
    const saved = { description: 'Old text', journey_steps: [{ key: 'overview' }] }
    expect(changedTemplateFields(JSON.stringify(saved), { description: '', journey_steps: [] })).toEqual({ description: '', journey_steps: [] })
    expect(changedTemplateFields(JSON.stringify(saved), saved)).toEqual({})
  })
})
