import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import SalesDemoLauncher from '../components/app/sales-demo/SalesDemoLauncher'

const render = props => renderToStaticMarkup(React.createElement(SalesDemoLauncher, { open: true, templates: [], ...props }))

describe('Sales Demo launch failure feedback', () => {
  it('renders the server error inside the open launch dialog', () => {
    const html = render({ error: 'The demo could not be prepared.' })
    const dialog = html.slice(html.indexOf('role="dialog"'), html.lastIndexOf('</section>'))
    expect(dialog).toContain('role="alert"')
    expect(dialog).toContain('The demo could not be prepared.')
  })
  it('does not show an alert before a failure or after the dialog closes', () => {
    expect(render({})).not.toContain('role="alert"')
    expect(render({ open: false, error: 'Earlier failure' })).toBe('')
  })
})
