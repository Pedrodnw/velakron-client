import { describe, expect, it } from 'vitest'
import { cacheVisualPreviewBestEffort, drawVisualPreviewSelection, focusedVisualPreviewCrop, mapVisualPreviewSelection } from '../components/app/visualContextPreview'

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

  it('zooms a linked visual around its selected point', () => {
    const crop = focusedVisualPreviewCrop(720, 405, { kind: 'point', x: 0.5, y: 0.5 }, { zoom: 1.7 })

    expect(crop.width).toBeCloseTo(423.53, 1)
    expect(crop.height).toBeCloseTo(238.24, 1)
    expect(crop.selection).toEqual({ kind: 'point', x: 0.5, y: 0.5 })
  })

  it('keeps an edge selection visible when focusing the linked visual', () => {
    const crop = focusedVisualPreviewCrop(720, 405, { kind: 'point', x: 0.96, y: 0.08 }, { zoom: 1.7 })

    expect(crop.x).toBeCloseTo(296.47, 1)
    expect(crop.y).toBe(0)
    expect(crop.selection.x).toBeGreaterThan(0.9)
    expect(crop.selection.y).toBeGreaterThan(0)
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

  it('keeps an optional linked-visual cache failure from rejecting case creation', async () => {
    const failedResult = { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Renderer version changed' } }

    await expect(cacheVisualPreviewBestEffort(async () => failedResult)).resolves.toEqual({
      saved: false,
      result: failedResult,
    })
    await expect(cacheVisualPreviewBestEffort(async () => {
      throw new Error('Temporary storage failure')
    })).resolves.toMatchObject({
      saved: false,
      result: { ok: false, error: { code: 'PREVIEW_CACHE_FAILED', message: 'Temporary storage failure' } },
    })
    await expect(cacheVisualPreviewBestEffort(async () => ({ ok: true }))).resolves.toEqual({
      saved: true,
      result: { ok: true },
    })
  })
})
