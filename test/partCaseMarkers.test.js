import { describe, expect, it } from 'vitest'
import { buildModelCaseMarkers, modelCaseMarkersForAsset } from '../components/app/partCaseMarkers'

const anchor = (id, sourceAsset = 'asset-a') => ({
  id,
  source_asset: sourceAsset,
  anchor_kind: 'model_face',
  anchor_data: { point: [1, 2, 3] },
})

describe('part case markers', () => {
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
