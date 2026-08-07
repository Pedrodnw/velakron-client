import { apiCallBegan } from '../../api'
import { createEntitySelectors, createNormalizedEntitySlice } from './createEntitySlice'

const slice = createNormalizedEntitySlice({
  name: 'facilities',
  dataKey: 'facilities',
  reducers: {
    facilityReceived: (state, action) => {
      const facility = action.payload?.data?.facility
      if (!facility) return
      const id = String(facility.id || facility._id)
      if (!state.ids.includes(id)) state.ids.push(id)
      state.byId[id] = facility
      state.loading = false
      state.error = null
    },
  },
})

const { listRequestFailed, listReceived, listRequested, facilityReceived } = slice.actions
const write = (url, method, payload) => apiCallBegan({
  url, method, data: payload,
  onStart: listRequested.type,
  onSuccess: facilityReceived.type,
  onError: listRequestFailed.type,
  requestKey: 'facility-write',
  organizationScoped: true,
})

export const loadFacilities = () => apiCallBegan({ url: '/facilities', onStart: listRequested.type, onSuccess: listReceived.type, onError: listRequestFailed.type, requestKey: 'facilities-list', organizationScoped: true })
export const createFacility = payload => write('/facilities', 'post', payload)
export const updateFacility = (id, payload) => write(`/facilities/${id}`, 'patch', payload)
export const archiveFacility = (id, payload) => write(`/facilities/${id}/archive`, 'post', payload)
export const facilitySelectors = createEntitySelectors('facilities')
export default slice.reducer
