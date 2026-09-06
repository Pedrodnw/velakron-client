import { describe, expect, it } from 'vitest'
import { drawVisualPreviewSelection, mapVisualPreviewSelection } from '../components/app/visualContextPreview'

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

  it('burns a point marker into the saved image pixels', () => {
    const calls = []
    const context = {
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      beginPath: () => calls.push('beginPath'),
      arc: (...values) => calls.push(['arc', ...values]),
      fill: () => calls.push('fill'),
      stroke: () => calls.push('stroke'),
    }

    drawVisualPreviewSelection(context, { kind: 'point', x: 0.25, y: 0.75 }, 720, 405)

    expect(calls).toContainEqual(['arc', 180, 303.75, 15, 0, Math.PI * 2])
    expect(calls.filter(call => call === 'fill')).toHaveLength(3)
    expect(calls).toContain('stroke')
  })

  it('burns a selected drawing region into the saved image pixels', () => {
    const calls = []
    const context = {
      save: () => calls.push('save'),
      restore: () => calls.push('restore'),
      fillRect: (...values) => calls.push(['fillRect', ...values]),
      strokeRect: (...values) => calls.push(['strokeRect', ...values]),
    }

    drawVisualPreviewSelection(context, { kind: 'region', x: 0.1, y: 0.2, width: 0.3, height: 0.4 }, 720, 405)

    expect(calls).toContainEqual(['fillRect', 72, 81, 216, 162])
    expect(calls.filter(call => Array.isArray(call) && call[0] === 'strokeRect')).toHaveLength(2)
  })
})
