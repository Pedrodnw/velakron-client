import { combineReducers } from '@reduxjs/toolkit'
import auth from './slices/auth'
import appContext, { experienceSwitchRequested } from './slices/appContext'
import entities from './slices/entities'
import ui from './slices/ui'
import identity from './slices/identity'

const combinedReducer = combineReducers({
  appContext,
  auth,
  identity,
  entities,
  ui,
})

const reducer = (state, action) => {
  const nextState = action.type === experienceSwitchRequested.type && state
    ? { ...state, entities: undefined }
    : state
  return combinedReducer(nextState, action)
}

export default reducer
