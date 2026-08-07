import { configureStore } from '@reduxjs/toolkit'
import { createWrapper } from 'next-redux-wrapper'
import reducer from './reducer'
import api from './middleware/api'

const makeStore = () => configureStore({
  reducer,
  middleware: getDefaultMiddleware => getDefaultMiddleware({
    immutableCheck: false,
    serializableCheck: false,
  }).concat(api),
})

export const wrapper = createWrapper(makeStore, { debug: false })
