import { describe, expect, it } from 'vitest'
import {
  isViewableModel,
  modelExtension,
  modelFormatLabel,
  modelMimeForFilename,
  suggestedPartAssetRole,
  uploadMimeForFile,
} from '../store/modelFiles'

describe('3D model file helpers', () => {
  it('normalizes STEP, STP, and STL uploads when the browser omits a MIME type', () => {
    expect(modelExtension('fixture.STEP')).toBe('step')
    expect(modelMimeForFilename('fixture.stp')).toBe('model/step')
    expect(modelMimeForFilename('fixture.stl')).toBe('model/stl')
    expect(uploadMimeForFile({ name: 'fixture.step', type: '' })).toBe('model/step')
    expect(uploadMimeForFile({ name: 'fixture.stl', type: 'application/octet-stream' })).toBe('model/stl')
  })

  it('offers the viewer only for server-approved or matching model files', () => {
    expect(isViewableModel({ viewer_kind: '3d_model' })).toBe(true)
    expect(isViewableModel({ display_filename: 'part.step', mime_type: 'model/step' })).toBe(true)
    expect(isViewableModel({ role: 'reference', attachment: { display_filename: 'part.stp', mime_type: 'model/step' } })).toBe(true)
    expect(isViewableModel({ name: 'part.stl', type: 'model/stl' })).toBe(true)
    expect(isViewableModel({ display_filename: 'part.pdf', mime_type: 'application/pdf' })).toBe(false)
    expect(modelFormatLabel({ display_filename: 'part.stl' })).toBe('STL')
    expect(modelFormatLabel({ display_filename: 'part.stp' })).toBe('STEP')
  })

  it('prevents silent reference uploads by detecting models and requiring a role for ambiguous files', () => {
    expect(suggestedPartAssetRole({ name: 'bracket.STEP' })).toMatchObject({
      role: 'primary_model', isPrimary: true, confidence: 'detected',
    })
    expect(suggestedPartAssetRole({ name: 'drawing.pdf' })).toMatchObject({
      role: '', isPrimary: false, confidence: 'choice_required',
    })
    expect(suggestedPartAssetRole({ name: 'inspection.txt' })).toMatchObject({
      role: '', isPrimary: false, confidence: 'choice_required',
    })
  })
})
