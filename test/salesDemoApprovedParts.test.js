import { describe, expect, it } from 'vitest'
import { normalizeApprovedParts, selectApprovedPart } from '../components/app/sales-demo/approvedParts'

const presets = [
  { key: 'ring', part_number: 'VLK-1001', name: 'Structural ring [Synthetic]', revision: 'A', legacy_part_numbers: ['AST-THM-310'] },
  { key: 'shaft', part_number: 'VLK-3001', name: 'Input shaft [Synthetic]', revision: 'A' },
]
const payload = { part_workspace: { preset_key: 'ring', production_record_key: 'one' }, production_records: [
  { key: 'one', partNumber: 'VLK-1001', quantity: 24 },
  { key: 'two', partNumber: 'AST-THM-310', quantity: 12 },
] }

describe('Sales Demo approved part selection', () => {
  it('fills matching identities for every record from the API catalog', () => {
    const result = normalizeApprovedParts(payload, presets)
    expect(result.production_records.map(record => record.partNumber)).toEqual(['VLK-1001', 'VLK-1001'])
    expect(result.production_records.every(record => record.partName === presets[0].name && record.revision === 'A')).toBe(true)
    expect(result.production_records.map(record => record.quantity)).toEqual([24, 12])
    expect(payload.production_records[1].partNumber).toBe('AST-THM-310')
  })
  it('keeps the featured model and drawing selection in sync with its record', () => {
    const result = selectApprovedPart(payload, 0, presets[1])
    expect(result.part_workspace.preset_key).toBe('shaft')
    expect(result.production_records[0]).toMatchObject({ partNumber: 'VLK-3001', partName: presets[1].name, revision: 'A', quantity: 24 })
    expect(selectApprovedPart(payload, 1, presets[1]).part_workspace).toEqual(payload.part_workspace)
    expect(selectApprovedPart(payload, 0, undefined)).toBe(payload)
  })
})
