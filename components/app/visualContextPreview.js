const DEFAULT_WIDTH = 360
const DEFAULT_HEIGHT = 202

const clamp = value => Math.min(1, Math.max(0, Number(value) || 0))

export const mapVisualPreviewSelection = (selection = {}, contentBounds = {}) => {
  const bounds = {
    x: clamp(contentBounds.x),
    y: clamp(contentBounds.y),
    width: clamp(contentBounds.width || 1),
    height: clamp(contentBounds.height || 1),
  }
  const x = bounds.x + clamp(selection.x) * bounds.width
  const y = bounds.y + clamp(selection.y) * bounds.height
  if (selection.kind !== 'region') return { kind: 'point', x: clamp(x), y: clamp(y) }
  return {
    kind: 'region',
    x: clamp(x),
    y: clamp(y),
    width: Math.min(bounds.x + bounds.width - x, clamp(selection.width) * bounds.width),
    height: Math.min(bounds.y + bounds.height - y, clamp(selection.height) * bounds.height),
  }
}

export const captureVisualContextPreview = (source, selection, options = {}) => {
  if (!source || typeof document === 'undefined') return null
  const sourceWidth = Number(source.naturalWidth || source.videoWidth || source.width || 0)
  const sourceHeight = Number(source.naturalHeight || source.videoHeight || source.height || 0)
  if (sourceWidth < 1 || sourceHeight < 1) return null

  try {
    const width = Math.max(1, Number(options.width) || DEFAULT_WIDTH)
    const height = Math.max(1, Number(options.height) || DEFAULT_HEIGHT)
    const scale = Math.min(width / sourceWidth, height / sourceHeight)
    const drawnWidth = sourceWidth * scale
    const drawnHeight = sourceHeight * scale
    const offsetX = (width - drawnWidth) / 2
    const offsetY = (height - drawnHeight) / 2
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) return null
    context.fillStyle = '#f7f9fc'
    context.fillRect(0, 0, width, height)
    context.drawImage(source, offsetX, offsetY, drawnWidth, drawnHeight)
    const contentBounds = {
      x: offsetX / width,
      y: offsetY / height,
      width: drawnWidth / width,
      height: drawnHeight / height,
    }
    return {
      data_url: canvas.toDataURL('image/jpeg', 0.84),
      selection: mapVisualPreviewSelection(selection, contentBounds),
    }
  } catch {
    return null
  }
}
