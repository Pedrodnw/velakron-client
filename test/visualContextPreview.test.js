import { describe, expect, it } from 'vitest'
import { mapVisualPreviewSelection } from '../components/app/visualContextPreview'

describe('visual context preview', () => {
  it('maps a selected point into a letterboxed thumbnail', () => {
    expect(mapVisualPreviewSelection(
      { kind: 'point', x: 0.5, y: 0.25 },
      { x: 0, y: 0.2, width: 1, height: 0.6 },
    )).toEqual({ kind: 'point', x: 0.5, y: 0.35 })
  })

  it('keeps a selected drawing region inside the rendered content bounds', () => {
    expect(mapVisualPreviewSelection(
      { kind: 'region', x: 0.25, y: 0.5, width: 0.2, height: 0.1 },
      { x: 0.1, y: 0, width: 0.8, height: 1 },
    )).toEqual({ kind: 'region', x: 0.30000000000000004, y: 0.5, width: 0.16000000000000003, height: 0.1 })
  })
})
