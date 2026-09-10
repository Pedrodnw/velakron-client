const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
const articles = require('../content/insights/articles.json')
const media = require('../content/marketing/mediaDimensions.json')
const routes = ['/', '/how-it-works', '/for-oems', '/for-suppliers', '/early-access', '/about', '/insights', '/quality', '/security', '/faq', '/contact', '/privacy', '/terms', '/acceptable-use', '/request-demo', '/visibility-assessment', '/confidentiality-terms']
const published = articles.filter(article => article.status === 'published')
const slugs = new Set()
for (const article of published) {
  assert.match(article.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  assert(!slugs.has(article.slug), `Duplicate article slug: ${article.slug}`)
  slugs.add(article.slug)
  for (const field of ['title', 'description', 'summary', 'intro', 'published', 'updated', 'media']) assert(article[field], `Missing ${field}: ${article.slug}`)
  assert(Number.isFinite(Date.parse(article.published)) && Number.isFinite(Date.parse(article.updated)), 'Invalid article date')
  assert(article.sections.length >= 3, 'Article needs a useful structure')
  const ids = new Set()
  for (const section of article.sections) {
    assert.match(section.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    assert(!ids.has(section.id), `Duplicate anchor: ${section.id}`); ids.add(section.id)
    assert(section.title && section.paragraphs.length, `Empty section: ${section.id}`)
    if (section.table) for (const row of section.table.rows) assert.equal(row.length, section.table.headings.length)
    for (const [, href] of section.links || []) assert(routes.includes(href.split('#')[0]) || published.some(other => href === `/insights/${other.slug}`), `Broken editorial link: ${href}`)
  }
  routes.push(`/insights/${article.slug}`)
}
for (const [name, size] of Object.entries(media)) {
  assert(size.width > 0 && size.height > 0)
  assert(fs.statSync(path.join(root, 'public/images/marketing', `${name}.webp`)).size > 0, `Missing product image: ${name}`)
}
assert(fs.existsSync(path.join(root, 'public/images/marketing/social-home.png')))
const origin='https://velakron.com'
const xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(route=>`  <url><loc>${origin}${route}</loc></url>`).join('\n')}\n</urlset>\n`
fs.writeFileSync(path.join(root, 'public/sitemap.xml'), xml)
fs.writeFileSync(path.join(root, 'public/robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`)
console.log(`Public content passed: ${routes.length} indexable routes, ${published.length} guides, ${Object.keys(media).length} product screenshots.`)
