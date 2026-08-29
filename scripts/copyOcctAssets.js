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

const pdfRoot = path.join(root, 'node_modules', 'pdfjs-dist')
const pdfDestination = path.join(root, 'public', 'vendor', 'pdfjs-dist')
const pdfAssets = [
  ['build/pdf.worker.min.mjs', 'pdf.worker.min.mjs'],
  ['LICENSE', 'LICENSE'],
]

fs.mkdirSync(pdfDestination, { recursive: true })
for (const [sourceAsset, destinationAsset] of pdfAssets) {
  const sourcePath = path.join(pdfRoot, sourceAsset)
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Required PDF drawing viewer asset is missing: ${sourceAsset}`)
  }
  fs.copyFileSync(sourcePath, path.join(pdfDestination, destinationAsset))
}

for (const directory of ['cmaps', 'standard_fonts']) {
  const sourcePath = path.join(pdfRoot, directory)
  const destinationPath = path.join(pdfDestination, directory)
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Required PDF drawing viewer directory is missing: ${directory}`)
  }
  fs.cpSync(sourcePath, destinationPath, { recursive: true })
}
