import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import PartCaseDrawer from '../components/app/PartCaseDrawer'

vi.mock('../components/app/PartAssetViewer', () => ({
  default: ({ onPreviewReady, selectedAnchorId }) => React.createElement('div', {
    'data-captures-image': typeof onPreviewReady === 'function',
    'data-selected-anchor': selectedAnchorId,
  }),
}))

const props = {
  open: true, mode: 'detail', organizationType: 'supplier',
  itemDetail: {
    item: {
      id: 'old-case', collaboration_version: 'part-collaboration-v2',
      title: 'Radius all the way to boss', state: 'closed',
      visual_anchor: { id: 'old-anchor', label: 'Flight Control Bell Crank', anchor_data: { point: [1, 2, 3] } },
    }, messages: [], attachments: [],
  },
  linkedVisual: { asset: { original_filename: 'bell-crank.step' }, source: '/private-model', loading: false },
}

describe('Older case visual references', () => {
  it.each(['open', 'closed', 'escalated'])('captures a still image for a %s case even without a cache callback', state => {
    const html = renderToStaticMarkup(React.createElement(PartCaseDrawer, {
      ...props, itemDetail: { ...props.itemDetail, item: { ...props.itemDetail.item, state } },
    }))
    expect(html).toContain('data-captures-image="true"')
    expect(html).toContain('data-selected-anchor="old-anchor"')
    expect(html).toContain('aria-hidden="true" inert=""')
    expect(html).toContain('Preparing image preview')
    expect(html).toContain('Open full viewer')
  })

  it('does not load a model when a saved preview exists or protected access is required', () => {
    for (const visual of [{ ...props.linkedVisual, preview: true }, { protected: true }]) {
      const html = renderToStaticMarkup(React.createElement(PartCaseDrawer, { ...props, linkedVisual: visual }))
      expect(html).not.toContain('data-captures-image')
      expect(html).toContain('Open full viewer')
    }
  })
})
