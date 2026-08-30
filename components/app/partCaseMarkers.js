const idOf = value => String(value?.id || value?._id || value || '')

const CASE_TYPE_PRESENTATION = Object.freeze({
  clarification: { label: 'Clarification', color: '#0969da', soft: '#eaf2ff', border: '#9ec5ff' },
  information: { label: 'Information', color: '#087f8c', soft: '#e5f7f8', border: '#8fd5da' },
  manufacturability_suggestion: { label: 'Manufacturability', color: '#7047b8', soft: '#f1ebfb', border: '#c9b4eb' },
  deviation_request: { label: 'Deviation request', color: '#b45309', soft: '#fff3e4', border: '#f0bf83' },
})

const defaultPresentation = { label: 'Technical case', color: '#475569', soft: '#eef2f7', border: '#cbd5e1' }

const byCreatedAt = (left, right) => {
  const leftTime = new Date(left?.created_at || 0).getTime()
  const rightTime = new Date(right?.created_at || 0).getTime()
  if (leftTime !== rightTime) return leftTime - rightTime
  return idOf(left).localeCompare(idOf(right))
}

export const caseTypePresentation = type => CASE_TYPE_PRESENTATION[type] || defaultPresentation

export const buildModelCaseMarkers = (anchors = [], cases = []) => {
  const anchorById = new Map(anchors.map(anchor => [idOf(anchor), anchor]))
  const orderedCases = [...cases].sort(byCreatedAt)
  const markers = orderedCases.flatMap((item, index) => {
    const anchorReference = item?.visual_anchor
    const anchor = anchorReference && typeof anchorReference === 'object'
      ? anchorReference
      : anchorById.get(idOf(anchorReference))
    if (!anchor || (anchor.anchor_kind || anchor.kind) !== 'model_face' || !Array.isArray(anchor.anchor_data?.point)) return []
    const presentation = caseTypePresentation(item.type)
    return [{
      id: idOf(item),
      anchor,
      anchorId: idOf(anchor),
      sourceAssetId: idOf(item.source_asset || anchor.source_asset),
      caseNumber: Number(item.case_number) || index + 1,
      caseItem: item,
      presentation,
    }]
  })

  const clusterSizes = markers.reduce((counts, marker) => {
    counts.set(marker.anchorId, (counts.get(marker.anchorId) || 0) + 1)
    return counts
  }, new Map())
  const clusterIndexes = new Map()

  return markers.map(marker => {
    const clusterIndex = clusterIndexes.get(marker.anchorId) || 0
    clusterIndexes.set(marker.anchorId, clusterIndex + 1)
    return { ...marker, clusterIndex, clusterSize: clusterSizes.get(marker.anchorId) || 1 }
  })
}

export const modelCaseMarkersForAsset = (markers = [], asset = null) => {
  const assetId = idOf(asset)
  return markers.filter(marker => !marker.sourceAssetId || marker.sourceAssetId === assetId)
}

