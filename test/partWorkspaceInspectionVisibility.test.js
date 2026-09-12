import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { describe, expect, it, vi } from 'vitest'
import reducer from '../store/reducer'
import ProductionPartWorkspace from '../components/app/ProductionPartWorkspace'

vi.mock('next/router', () => ({ useRouter: () => ({ query: {}, replace: vi.fn() }) }))
vi.mock('../components/app/AppDialogProvider', () => ({ useAppDialog: () => vi.fn() }))

const render = (side, { caseOwned = false, acknowledgement = false } = {}) => {
  const state = structuredClone(reducer(undefined, { type: 'init' }))
  // Existing sessions can still enable inspection and retain loaded plans/runs.
  state.appContext.features = { inspection: true, collaboration_v2: true }
  state.entities.parts.revisionDetailsById.revision = {
    revision: { id: 'revision', revision: 'A' }, assets: [], anchors: [],
    requirements: [{ id: 'requirement', title: 'Material certificate', acknowledgement_requested: acknowledgement }],
  }
  state.entities.inspection.plansByRevision.revision = { characteristics: [{ id: 'checkpoint', title: 'Ring gear tooth feature' }] }
  state.entities.inspection.runsByProduction.production = [
    { id: 'supplier-run', state: 'in_progress', current_actor_side: 'supplier' },
    { id: 'oem-run', state: 'submitted', current_actor_side: 'oem' },
  ]
  if (caseOwned) state.entities.parts.collaborationByPart.part = [{ id: 'case', state: 'open', current_actor_side: side, part_revision: 'revision', production_records: ['production'] }]
  return renderToStaticMarkup(React.createElement(Provider, { store: configureStore({ reducer, preloadedState: state }) }, React.createElement(ProductionPartWorkspace, {
    record: { id: 'production', part: 'part', part_revision: 'revision', inspection_plan: 'plan' }, organization: { type: side },
  })))
}

describe('Temporarily hidden inspection in the part collaborator', () => {
  it.each(['oem', 'supplier'])('does not expose inspection shortcuts or count cached inspection work for %s', side => {
    const html = render(side)
    expect(html).not.toMatch(/checkpoint|inspection stage|inspection decisions|Open next action/)
    expect(html).not.toContain('> Inspection')
    expect(html).toContain('Technical record is up to date')
    expect(html).toContain('1 requirement')
  })
  it.each(['oem', 'supplier'])('keeps ordinary case actions for %s', side => {
    const html = render(side, { caseOwned: true })
    expect(html).toContain('1 technical action needs your company')
    expect(html).toContain('Open next action')
    expect(html).not.toContain('inspection stage')
  })
  it('keeps supplier requirement acknowledgements actionable', () => {
    const html = render('supplier', { acknowledgement: true })
    expect(html).toContain('1 technical action needs your company')
    expect(html).toContain('Open next action')
    expect(html).toContain('1 awaiting acknowledgement')
  })
})
