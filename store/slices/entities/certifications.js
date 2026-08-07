import { apiCallBegan } from '../../api'
import { openDownloadTarget, uploadFileToIntent } from '../../fileTransfer'
import { createEntitySelectors, createNormalizedEntitySlice } from './createEntitySlice'

const slice = createNormalizedEntitySlice({
  name: 'certifications',
  dataKey: 'certifications',
  reducers: {
    certificationReceived: (state, action) => {
      const certification = action.payload?.data?.certification
      if (!certification) return
      const id = String(certification.id || certification._id)
      if (!state.ids.includes(id)) state.ids.push(id)
      state.byId[id] = certification
      state.loading = false
      state.error = null
    },
  },
})

const { listRequestFailed, listReceived, listRequested, certificationReceived } = slice.actions
const write = (url, method, payload) => apiCallBegan({ url, method, data: payload, onStart: listRequested.type, onSuccess: certificationReceived.type, onError: listRequestFailed.type, requestKey: 'certification-write', organizationScoped: true })

export const loadCertifications = (params = {}) => apiCallBegan({ url: '/certifications', params, onStart: listRequested.type, onSuccess: listReceived.type, onError: listRequestFailed.type, requestKey: 'certifications-list', organizationScoped: true })
export const createCertification = payload => write('/certifications', 'post', payload)
export const updateCertification = (id, payload) => write(`/certifications/${id}`, 'patch', payload)
export const archiveCertification = (id, payload) => write(`/certifications/${id}/archive`, 'post', payload)
export const uploadCertificationDocument = (id, file, onProgress = () => {}) => async dispatch => {
  const intent = await dispatch(apiCallBegan({
    url: `/certifications/${id}/attachment`,
    method: 'post',
    data: { filename: file.name, mime_type: file.type || 'application/pdf', byte_size: file.size },
    onError: listRequestFailed.type,
    requestKey: 'certification-document',
    organizationScoped: true,
  }))
  if (!intent?.ok) return intent
  try {
    await uploadFileToIntent({ file, upload: intent.payload.data.upload, onProgress })
  } catch (error) {
    return { ok: false, error: error.response?.data?.error || { message: error.message } }
  }
  return dispatch(apiCallBegan({
    url: `/certifications/${id}/attachment/${intent.payload.data.attachment.id}/finalize`,
    method: 'post',
    data: {},
    onError: listRequestFailed.type,
    requestKey: 'certification-document-finalize',
    organizationScoped: true,
  }))
}
export const downloadCertificationDocument = (id, attachmentId) => async dispatch => {
  const result = await dispatch(apiCallBegan({
    url: `/certifications/${id}/attachment/${attachmentId}/download-intent`,
    method: 'post', data: {}, organizationScoped: true,
    requestKey: `certification-document-download-${attachmentId}`,
  }))
  if (result?.ok) openDownloadTarget(result.payload.data.download.target)
  return result
}
export const certificationSelectors = createEntitySelectors('certifications')
export default slice.reducer
