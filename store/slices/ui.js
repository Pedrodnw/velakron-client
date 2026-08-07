import { createSlice } from '@reduxjs/toolkit'

const slice = createSlice({
  name: 'ui',
  initialState: {
    mobileNavigationOpen: false,
    supplierOnboardingStep: 'company',
  },
  reducers: {
    mobileNavigationToggled: state => {
      state.mobileNavigationOpen = !state.mobileNavigationOpen
    },
    mobileNavigationClosed: state => {
      state.mobileNavigationOpen = false
    },
    supplierOnboardingStepChanged: (state, action) => {
      state.supplierOnboardingStep = action.payload
    },
  },
})

export const {
  mobileNavigationToggled,
  mobileNavigationClosed,
  supplierOnboardingStepChanged,
} = slice.actions

export const getMobileNavigationOpen = state => state.ui.mobileNavigationOpen
export const getSupplierOnboardingStep = state => state.ui.supplierOnboardingStep

export default slice.reducer
