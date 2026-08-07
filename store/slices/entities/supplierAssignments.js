import { createSlice } from '@reduxjs/toolkit'
import { organizationContextCleared, organizationSwitchRequested } from '../appContext'

const initialState = { ids: [], byId: {} }
const normalized = records => (records || []).reduce((result, item) => {
  const id = String(item.id || item._id)
  if (!id) return result
  result.ids.push(id)
  result.byId[id] = item
  return result
}, { ids: [], byId: {} })

const slice = createSlice({
  name: 'supplierAssignments',
  initialState,
  reducers: {
    supplierAssignmentsReceived: (_state, action) => normalized(action.payload),
  },
  extraReducers: builder => {
    builder.addCase(organizationContextCleared, () => initialState)
    builder.addCase(organizationSwitchRequested, () => initialState)
  },
})

export const { supplierAssignmentsReceived } = slice.actions
export default slice.reducer
