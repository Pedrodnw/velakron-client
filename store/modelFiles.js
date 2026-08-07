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

export const isViewableModel = file => file?.viewer_kind === '3d_model'
  || modelMimeForFilename(file?.display_filename || file?.original_filename) === String(file?.mime_type || '').toLowerCase()

export const modelFormatLabel = file => {
  const extension = modelExtension(file?.display_filename || file?.original_filename)
  return extension === 'stl' ? 'STL' : extension ? 'STEP' : '3D model'
}

