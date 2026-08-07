const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const source = path.join(root, 'node_modules', 'occt-import-js', 'dist')
const destination = path.join(root, 'public', 'vendor', 'occt-import-js')
const assets = [
  'occt-import-js.wasm',
  'license.occt-import-js.txt',
  'license.occt.txt',
]

fs.mkdirSync(destination, { recursive: true })
for (const asset of assets) {
  const sourcePath = path.join(source, asset)
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Required 3D viewer asset is missing: ${asset}`)
  }
  fs.copyFileSync(sourcePath, path.join(destination, asset))
}
