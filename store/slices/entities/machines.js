import { apiCallBegan } from '../../api'
import { openDownloadTarget, uploadFileToIntent } from '../../fileTransfer'
import { createEntitySelectors, createNormalizedEntitySlice } from './createEntitySlice'

const slice = createNormalizedEntitySlice({
  name: 'machines',
  dataKey: 'machines',
  reducers: {
    machineReceived: (state, action) => {
      const machine = action.payload?.data?.machine
      if (!machine) return
      const id = String(machine.id || machine._id)
      if (!state.ids.includes(id)) state.ids.push(id)
      state.byId[id] = machine
      state.selected = id
      state.loading = false
      state.error = null
    },
  },
})

const { listRequestFailed, listReceived, listRequested, machineReceived } = slice.actions
const write = (url, method, payload) => apiCallBegan({ url, method, data: payload, onStart: listRequested.type, onSuccess: machineReceived.type, onError: listRequestFailed.type, requestKey: 'machine-write', organizationScoped: true })

export const loadMachines = (params = {}) => apiCallBegan({ url: '/machines', params, onStart: listRequested.type, onSuccess: listReceived.type, onError: listRequestFailed.type, requestKey: 'machines-list', organizationScoped: true })
export const loadMachine = (id, supplierOrganizationId) => apiCallBegan({ url: `/machines/${id}`, params: supplierOrganizationId ? { supplier_organization_id: supplierOrganizationId } : undefined, onStart: listRequested.type, onSuccess: machineReceived.type, onError: listRequestFailed.type, requestKey: 'machine-detail', organizationScoped: true })
export const createMachine = payload => write('/machines', 'post', payload)
export const updateMachine = (id, payload) => write(`/machines/${id}`, 'patch', payload)
export const archiveMachine = (id, payload) => write(`/machines/${id}/archive`, 'post', payload)
export const reactivateMachine = (id, version) => write(`/machines/${id}/reactivate`, 'post', { version })
export const uploadMachinePhoto = (id, file, onProgress = () => {}) => async dispatch => {
  const intent = await dispatch(apiCallBegan({
    url: `/machines/${id}/photos`,
    method: 'post',
    data: { filename: file.name, mime_type: file.type || 'image/jpeg', byte_size: file.size, caption: '' },
    onError: listRequestFailed.type,
    requestKey: 'machine-photo',
    organizationScoped: true,
  }))
  if (!intent?.ok) return intent
  try {
    await uploadFileToIntent({ file, upload: intent.payload.data.upload, onProgress })
  } catch (error) {
    return { ok: false, error: error.response?.data?.error || { message: error.message } }
  }
  return dispatch(apiCallBegan({
    url: `/machines/${id}/photos/${intent.payload.data.attachment.id}/finalize`,
    method: 'post',
    data: {},
    onError: listRequestFailed.type,
    requestKey: 'machine-photo-finalize',
    organizationScoped: true,
  }))
}
export const downloadMachinePhoto = (id, attachmentId) => async dispatch => {
  const result = await dispatch(apiCallBegan({
    url: `/machines/${id}/photos/${attachmentId}/download-intent`,
    method: 'post', data: {}, organizationScoped: true,
    requestKey: `machine-photo-download-${attachmentId}`,
  }))
  if (result?.ok) openDownloadTarget(result.payload.data.download.target)
  return result
}
export const machineSelectors = createEntitySelectors('machines')
export default slice.reducer
