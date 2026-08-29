const MODEL_MIME_BY_EXTENSION = Object.freeze({
  step: 'model/step',
  stl: 'model/stl',
  stp: 'model/step',
})

export const modelExtension = filename => {
  const match = String(filename || '').trim().toLowerCase().match(/\.([a-z0-9]+)$/)
  return match && MODEL_MIME_BY_EXTENSION[match[1]] ? match[1] : null
}

export const modelMimeForFilename = filename => {
  const extension = modelExtension(filename)
  return extension ? MODEL_MIME_BY_EXTENSION[extension] : null
}

export const uploadMimeForFile = file => modelMimeForFilename(file?.name)
  || String(file?.type || 'application/octet-stream').toLowerCase()

export const suggestedPartAssetRole = file => {
  if (!file?.name) return { role: '', isPrimary: false, confidence: 'none', message: '' }
  if (modelExtension(file.name)) return {
    role: 'primary_model',
    isPrimary: true,
    confidence: 'detected',
    message: '3D model detected. It will open as the primary model for this revision.',
  }
  const extension = String(file.name).trim().toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]
  if (['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(extension)) return {
    role: '',
    isPrimary: false,
    confidence: 'choice_required',
    message: 'Choose whether this visual file is a drawing, specification, inspection plan, or reference.',
  }
  return {
    role: '',
    isPrimary: false,
    confidence: 'choice_required',
    message: 'Choose the role this file plays in the controlled revision package.',
  }
}

export const isViewableModel = file => {
  const candidate = file?.attachment || file
  const filename = candidate?.display_filename || candidate?.original_filename || candidate?.name
  const mimeType = String(candidate?.mime_type || candidate?.type || '').toLowerCase()

  return candidate?.viewer_kind === '3d_model'
    || modelMimeForFilename(filename) === mimeType
}

export const modelFormatLabel = file => {
  const extension = modelExtension(file?.display_filename || file?.original_filename)
  return extension === 'stl' ? 'STL' : extension ? 'STEP' : '3D model'
}
