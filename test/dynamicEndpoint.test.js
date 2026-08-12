import { describe, expect, it } from 'vitest'
import { dynamicEndpointMimeForFile } from '../store/slices/entities/dynamicEndpoint'

describe('dynamic endpoint file handling', () => {
  it('normalizes supported marketing file MIME types from filenames', () => {
    expect(dynamicEndpointMimeForFile({ name: 'campaign.JPG', type: '' })).toBe('image/jpeg')
    expect(dynamicEndpointMimeForFile({ name: 'one-sheet.pdf', type: 'application/pdf' })).toBe('application/pdf')
    expect(dynamicEndpointMimeForFile({ name: 'notes.txt', type: '' })).toBe('text/plain')
  })
})
