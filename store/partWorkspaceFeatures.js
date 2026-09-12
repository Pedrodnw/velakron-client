import { getFeatureEnabled } from './slices/appContext'

// Inspection is temporarily hidden throughout the part collaborator, including
// its checkpoints, shortcuts, and action queue. Keep stored inspection data intact.
const inspectionVisibleInPartWorkspace = false

export const getPartWorkspaceInspectionEnabled = state => inspectionVisibleInPartWorkspace && getFeatureEnabled('inspection')(state)
