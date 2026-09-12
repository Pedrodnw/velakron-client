import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import reducer from '../store/reducer'
import ProductionPartWorkspace from '../components/app/ProductionPartWorkspace'

const navigation = vi.hoisted(() => ({ replace: vi.fn(), click: null, tab: 'cases' }))
vi.mock('next/router', () => ({ useRouter: () => ({
  pathname: '/app/production/[id]',
  query: { id: 'production', part_tab: navigation.tab },
  replace: navigation.replace,
}) }))
vi.mock('../components/app/AppDialogProvider', () => ({ useAppDialog: () => vi.fn() }))
vi.mock('../components/design-system', async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, Button: props => {
    if (props.children === 'Open next action') navigation.click = props.onClick
    return React.createElement(actual.Button, props)
  } }
})

const item = (id, side, extra = {}) => ({ id, title: id, state: 'open', current_actor_side: side, part_revision: 'revision', production_records: ['production'], ...extra })
const render = (side, cases) => {
  const state = structuredClone(reducer(undefined, { type: 'init' }))
  state.appContext.features = { inspection: false, collaboration_v2: true }
  state.entities.parts.revisionDetailsById.revision = { revision: { id: 'revision', revision: 'A' }, assets: [], anchors: [], requirements: [] }
  state.entities.parts.collaborationByPart.part = cases
  const store = configureStore({ reducer, preloadedState: state })
  return renderToStaticMarkup(React.createElement(Provider, { store }, React.createElement(ProductionPartWorkspace, {
    record: { id: 'production', part: 'part', part_revision: 'revision' }, organization: { type: side },
  })))
}

describe('Open next technical action', () => {
  beforeEach(() => { navigation.replace.mockClear(); navigation.click = null; navigation.tab = 'cases' })
  it.each(['oem', 'supplier'])('opens the %s-owned case directly even when Cases and messages is already selected', side => {
    const other = side === 'oem' ? 'supplier' : 'oem'
    render(side, [item('closed-case', side, { state: 'closed' }), item('other-company', other), item('unrelated-production', side, { production_records: ['elsewhere'] }), item('needs-response', side)])
    expect(navigation.click).toBeTypeOf('function')
    navigation.click()
    expect(navigation.replace).toHaveBeenCalledWith({ pathname: '/app/production/[id]', query: {
      id: 'production', part_tab: 'cases', collaboration: 'needs-response',
    } }, undefined, { shallow: true })
  })
  it('does not offer an action for a closed case or work owned by the other company', () => {
    render('oem', [item('closed-case', 'oem', { state: 'closed' }), item('supplier-action', 'supplier')])
    expect(navigation.click).toBeNull()
  })
})
