const DEFAULT_WIDTH = 720
const DEFAULT_HEIGHT = 405

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

const drawPointMarker = (context, selection, width, height) => {
  const x = selection.x * width
  const y = selection.y * height
  const radius = Math.max(8, Math.round(Math.min(width, height) * 0.025))

  context.save()
  context.shadowColor = 'rgba(6, 20, 38, 0.34)'
  context.shadowBlur = Math.max(7, radius * 0.8)
  context.beginPath()
  context.arc(x, y, radius + 5, 0, Math.PI * 2)
  context.fillStyle = 'rgba(255, 255, 255, 0.96)'
  context.fill()
  context.shadowBlur = 0
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.fillStyle = '#0969ff'
  context.fill()
  context.lineWidth = Math.max(2, radius * 0.22)
  context.strokeStyle = '#ffffff'
  context.stroke()
  context.beginPath()
  context.arc(x, y, Math.max(2.5, radius * 0.25), 0, Math.PI * 2)
  context.fillStyle = '#ffffff'
  context.fill()
  context.restore()
}

const drawRegionMarker = (context, selection, width, height) => {
  const x = selection.x * width
  const y = selection.y * height
  const regionWidth = Math.max(8, selection.width * width)
  const regionHeight = Math.max(8, selection.height * height)
  const lineWidth = Math.max(3, Math.round(Math.min(width, height) * 0.008))

  context.save()
  context.fillStyle = 'rgba(9, 105, 255, 0.18)'
  context.fillRect(x, y, regionWidth, regionHeight)
  context.lineWidth = lineWidth + 4
  context.strokeStyle = 'rgba(255, 255, 255, 0.96)'
  context.strokeRect(x, y, regionWidth, regionHeight)
  context.lineWidth = lineWidth
  context.strokeStyle = '#0969ff'
  context.strokeRect(x, y, regionWidth, regionHeight)
  context.restore()
}

export const drawVisualPreviewSelection = (context, selection, width, height) => {
  if (!context || !selection) return
  if (selection.kind === 'region') drawRegionMarker(context, selection, width, height)
  else drawPointMarker(context, selection, width, height)
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
    const mappedSelection = mapVisualPreviewSelection(selection, contentBounds)
    drawVisualPreviewSelection(context, mappedSelection, width, height)
    return {
      data_url: canvas.toDataURL('image/png'),
      mime_type: 'image/png',
      width,
      height,
      selection: mappedSelection,
    }
  } catch {
    return null
  }
}

export const visualPreviewToBlob = preview => {
  if (!preview?.data_url || !String(preview.data_url).startsWith('data:image/png;base64,')) return null
  const encoded = String(preview.data_url).slice('data:image/png;base64,'.length)
  try {
    const binary = globalThis.atob(encoded)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    return new Blob([bytes], { type: 'image/png' })
  } catch {
    return null
  }
}
