import { describe, expect, it } from 'vitest'
import { buildModelCaseMarkers, casesForProduction, modelCaseMarkersForAsset, productionVisualAnchors } from '../components/app/partCaseMarkers'

const anchor = (id, sourceAsset = 'asset-a') => ({
  id,
  source_asset: sourceAsset,
  anchor_kind: 'model_face',
  anchor_data: { point: [1, 2, 3] },
})

describe('part case markers', () => {
  it('starts a new order without earlier-order model or drawing annotations', () => {
    const anchors = [anchor('model'), { id: 'drawing', kind: 'drawing_region' }]
    const history = [{ id: 'old', production_records: ['older-order'], visual_anchor: 'model' }, { id: 'old-drawing', primary_production_record: 'older-order', visual_anchor: 'drawing' }]
    const cases = casesForProduction(history, 'new-order')
    expect(cases).toEqual([])
    expect(buildModelCaseMarkers(anchors, cases)).toEqual([])
    expect(productionVisualAnchors(anchors, cases)).toEqual([])
    expect(casesForProduction(history, 'older-order')).toEqual(history)
  })

  it('retains current-order, shared requirement, formal and explicitly opened history references', () => {
    const anchors = ['current', 'requirement', 'formal', 'history', 'unused'].map(id => anchor(id))
    const cases = casesForProduction([
      { id: 'current-case', primary_production_record: { _id: 'new-order' }, visual_anchor: { id: 'current' } },
      { id: 'linked-case', production_records: [{ id: 'new-order' }], visual_anchor: 'current' },
      { id: 'old-case', production_records: ['older-order'], visual_anchor: 'history' },
    ], 'new-order')
    expect(cases.map(item => item.id)).toEqual(['current-case', 'linked-case'])
    expect(productionVisualAnchors(anchors, cases, [{ visual_anchor: 'requirement' }], [{ visual_anchor: 'formal' }], 'history').map(item => item.id)).toEqual(['current', 'requirement', 'formal', 'history'])
  })

  it('numbers cases by creation order and keeps cases sharing an anchor individually clickable', () => {
    const sharedAnchor = anchor('anchor-a')
    const markers = buildModelCaseMarkers([sharedAnchor], [
      { id: 'case-b', title: 'Second', type: 'information', created_at: '2026-08-02', visual_anchor: sharedAnchor, source_asset: 'asset-a' },
      { id: 'case-a', title: 'First', type: 'clarification', created_at: '2026-08-01', visual_anchor: sharedAnchor, source_asset: 'asset-a' },
    ])

    expect(markers.map(marker => [marker.caseNumber, marker.caseItem.title])).toEqual([[1, 'First'], [2, 'Second']])
    expect(markers.map(marker => marker.clusterIndex)).toEqual([0, 1])
    expect(markers.every(marker => marker.clusterSize === 2)).toBe(true)
    expect(new Set(markers.map(marker => marker.presentation.color)).size).toBe(2)
  })

  it('only returns model markers belonging to the open asset', () => {
    const markers = buildModelCaseMarkers([anchor('anchor-a'), anchor('anchor-b', 'asset-b')], [
      { id: 'case-a', type: 'clarification', created_at: '2026-08-01', visual_anchor: 'anchor-a', source_asset: 'asset-a' },
      { id: 'case-b', type: 'clarification', created_at: '2026-08-02', visual_anchor: 'anchor-b', source_asset: 'asset-b' },
    ])

    expect(modelCaseMarkersForAsset(markers, { id: 'asset-b' }).map(marker => marker.id)).toEqual(['case-b'])
  })
})
