import { combineReducers } from '@reduxjs/toolkit'
import auth from './slices/auth'
import appContext from './slices/appContext'
import entities from './slices/entities'
import ui from './slices/ui'
import identity from './slices/identity'

export default combineReducers({
  appContext,
  auth,
  identity,
  entities,
  ui,
})
