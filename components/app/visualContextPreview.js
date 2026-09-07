const DEFAULT_WIDTH = 720
const DEFAULT_HEIGHT = 405

const clamp = value => Math.min(1, Math.max(0, Number(value) || 0))
const clampRange = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))

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

export const focusedVisualPreviewCrop = (sourceWidth, sourceHeight, selection = {}, options = {}) => {
  const width = Math.max(1, Number(sourceWidth) || 1)
  const height = Math.max(1, Number(sourceHeight) || 1)
  const outputAspect = Math.max(0.1, Number(options.outputAspect) || (DEFAULT_WIDTH / DEFAULT_HEIGHT))
  const zoom = clampRange(Number(options.zoom) || 1, 1, 2)
  const sourceAspect = width / height
  const baseWidth = sourceAspect > outputAspect ? height * outputAspect : width
  const baseHeight = sourceAspect > outputAspect ? height : width / outputAspect
  const cropWidth = baseWidth / zoom
  const cropHeight = baseHeight / zoom
  const selectionWidth = selection.kind === 'region' ? clamp(selection.width) : 0
  const selectionHeight = selection.kind === 'region' ? clamp(selection.height) : 0
  const focusX = (clamp(selection.x) + (selectionWidth / 2)) * width
  const focusY = (clamp(selection.y) + (selectionHeight / 2)) * height
  const x = clampRange(focusX - (cropWidth / 2), 0, width - cropWidth)
  const y = clampRange(focusY - (cropHeight / 2), 0, height - cropHeight)
  const mappedX = clamp(((clamp(selection.x) * width) - x) / cropWidth)
  const mappedY = clamp(((clamp(selection.y) * height) - y) / cropHeight)
  const mappedSelection = selection.kind === 'region'
    ? {
        kind: 'region',
        x: mappedX,
        y: mappedY,
        width: Math.min(1 - mappedX, (selectionWidth * width) / cropWidth),
        height: Math.min(1 - mappedY, (selectionHeight * height) / cropHeight),
      }
    : {
        kind: 'point',
        x: mappedX,
        y: mappedY,
      }
  return { x, y, width: cropWidth, height: cropHeight, selection: mappedSelection }
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
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) return null
    context.fillStyle = '#f7f9fc'
    context.fillRect(0, 0, width, height)
    const zoom = Math.max(1, Number(options.zoom) || 1)
    let mappedSelection
    if (zoom > 1) {
      const crop = focusedVisualPreviewCrop(sourceWidth, sourceHeight, selection, {
        outputAspect: width / height,
        zoom,
      })
      context.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height)
      mappedSelection = crop.selection
    } else {
      const scale = Math.min(width / sourceWidth, height / sourceHeight)
      const drawnWidth = sourceWidth * scale
      const drawnHeight = sourceHeight * scale
      const offsetX = (width - drawnWidth) / 2
      const offsetY = (height - drawnHeight) / 2
      context.drawImage(source, offsetX, offsetY, drawnWidth, drawnHeight)
      mappedSelection = mapVisualPreviewSelection(selection, {
        x: offsetX / width,
        y: offsetY / height,
        width: drawnWidth / width,
        height: drawnHeight / height,
      })
    }
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
