import { describe, expect, it } from 'vitest'
import { clampDrawingPage, drawingAnchorStyle, drawingFitScale, normalizedDrawingPoint } from '../store/drawingViewer'

describe('drawing viewer geometry', () => {
  it('keeps page navigation inside the document', () => {
    expect(clampDrawingPage(0, 4)).toBe(1)
    expect(clampDrawingPage(3, 4)).toBe(3)
    expect(clampDrawingPage(9, 4)).toBe(4)
  })

  it('calculates fit-page and fit-width scales', () => {
    expect(drawingFitScale({ pageWidth: 1000, pageHeight: 800, containerWidth: 1032, containerHeight: 832, mode: 'page' })).toBe(1)
    expect(drawingFitScale({ pageWidth: 1000, pageHeight: 2000, containerWidth: 1032, containerHeight: 832, mode: 'page' })).toBe(0.4)
    expect(drawingFitScale({ pageWidth: 1000, pageHeight: 2000, containerWidth: 1032, containerHeight: 832, mode: 'width' })).toBe(1)
  })

  it('normalizes pointer and saved-anchor coordinates to the drawing sheet', () => {
    expect(normalizedDrawingPoint({ clientX: 150, clientY: 250 }, { left: 50, top: 50, width: 200, height: 400 })).toEqual({ x: 0.5, y: 0.5 })
    expect(drawingAnchorStyle({ anchor_data: { x: 0.25, y: 0.5, width: 0.2, height: 0.1 } })).toEqual({ left: '25%', top: '50%', width: '20%', height: '10%' })
    expect(drawingAnchorStyle({ anchor_data: { x: 0.25, y: 0.5, width: 0.2, height: 0.1 } }, 90)).toEqual({ left: '40%', top: '25%', width: '10%', height: '20%' })
  })
})
