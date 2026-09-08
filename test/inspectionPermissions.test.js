import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Provider } from 'react-redux'
import { describe, expect, it } from 'vitest'
import { InspectionRunWorkspace } from '../components/app/InspectionQualityPanel'

const renderWorkspace = (permissions, runState = 'changes_requested', organizationType = 'supplier') => {
  const detail = {
    run: { id: 'run', state: runState, kind: 'final', current_actor_side: organizationType, required_results: 1, completed_results: 1, sample_scope: [{ characteristic: 'checkpoint', required_count: 1 }] },
    characteristics: [{ id: 'checkpoint', characteristic_id: 'FN-01', title: 'Final surface', type: 'attribute', attribute_expectation: 'pass' }],
    results: [{ id: 'result', inspection_characteristic: 'checkpoint', sample_key: '1', attribute_value: 'fail', status: 'fail_unconfirmed' }],
    active_result_ids: ['result'],
    submissions: [{ id: 'package', submission_number: 1, state: runState, manifest_hash: 'synthetic-package-hash', review_note: 'Inspect the corrected surface.' }],
  }
  const state = { appContext: { permissions }, entities: { inspection: { detailsByRun: { run: detail }, attachmentsByRun: {} } } }
  const store = { getState: () => state, subscribe: () => () => {}, dispatch: () => {} }
  return renderToStaticMarkup(React.createElement(Provider, { store }, React.createElement(InspectionRunWorkspace, { runId: 'run', production: { part_number: 'QA-100' }, organizationType })))
}

describe('Inspection workspace permissions', () => {
  it('keeps results and package history visible to viewers without write controls', () => {
    const html = renderWorkspace(['inspection.run.read', 'inspection.audit.read'])
    for (const text of ['Final surface', 'Inspect the corrected surface.', 'Submission history', 'Download current PDF']) expect(html).toContain(text)
    for (const text of ['Save responsibility', 'Import CMM CSV', '>Correct<', 'Confirm failure', 'Validate &amp; submit correction', 'Record decision']) expect(html).not.toContain(text)
    expect(html).toMatch(/<select disabled=""/)
    expect(renderWorkspace(['inspection.run.read'], 'submitted', 'oem')).not.toContain('Record decision')
  })

  it('retains recording, failure confirmation and submission for authorized inspectors', () => {
    const html = renderWorkspace(['inspection.result.record', 'inspection.failure.confirm', 'inspection.package.submit'])
    for (const text of ['Save responsibility', 'Import CMM CSV', '>Correct<', 'Confirm failure', 'Validate &amp; submit correction']) expect(html).toContain(text)
  })

  it('checks each formal inspection permission independently', () => {
    const recorder = renderWorkspace(['inspection.result.record'])
    expect(recorder).toContain('Import CMM CSV')
    expect(recorder).not.toContain('Confirm failure')
    expect(recorder).not.toContain('Validate &amp; submit correction')
    expect(renderWorkspace(['inspection.package.submit'])).toContain('Validate &amp; submit correction')
    expect(renderWorkspace(['inspection.package.review'], 'submitted', 'oem')).toContain('Record decision')
  })
})
