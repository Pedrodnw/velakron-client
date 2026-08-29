export const clampDrawingPage = (page, pageCount) => {
  const maximum = Math.max(1, Number(pageCount) || 1)
  return Math.min(maximum, Math.max(1, Math.round(Number(page) || 1)))
}

export const drawingFitScale = ({ pageWidth, pageHeight, containerWidth, containerHeight, mode = 'page', padding = 32 }) => {
  const width = Math.max(1, Number(pageWidth) || 1)
  const height = Math.max(1, Number(pageHeight) || 1)
  const availableWidth = Math.max(1, (Number(containerWidth) || width) - padding)
  const availableHeight = Math.max(1, (Number(containerHeight) || height) - padding)
  const widthScale = availableWidth / width
  if (mode === 'width') return Math.max(0.1, widthScale)
  return Math.max(0.1, Math.min(widthScale, availableHeight / height))
}

export const normalizedDrawingPoint = ({ clientX, clientY }, rect) => ({
  x: Math.min(1, Math.max(0, (clientX - rect.left) / Math.max(1, rect.width))),
  y: Math.min(1, Math.max(0, (clientY - rect.top) / Math.max(1, rect.height))),
})

export const drawingAnchorStyle = (anchor, rotation = 0) => {
  const data = anchor?.anchor_data || {}
  const source = {
    x: Math.min(1, Math.max(0, Number(data.x) || 0)),
    y: Math.min(1, Math.max(0, Number(data.y) || 0)),
    width: Math.min(1, Math.max(0, Number(data.width) || 0)),
    height: Math.min(1, Math.max(0, Number(data.height) || 0)),
  }
  const normalizedRotation = ((Number(rotation) || 0) % 360 + 360) % 360
  const transformed = normalizedRotation === 90
    ? { x: 1 - source.y - source.height, y: source.x, width: source.height, height: source.width }
    : normalizedRotation === 180
      ? { x: 1 - source.x - source.width, y: 1 - source.y - source.height, width: source.width, height: source.height }
      : normalizedRotation === 270
        ? { x: source.y, y: 1 - source.x - source.width, width: source.height, height: source.width }
        : source
  return {
    left: `${transformed.x * 100}%`,
    top: `${transformed.y * 100}%`,
    width: data.width ? `${transformed.width * 100}%` : undefined,
    height: data.height ? `${transformed.height * 100}%` : undefined,
  }
}
