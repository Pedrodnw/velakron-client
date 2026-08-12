import { combineReducers } from '@reduxjs/toolkit'
import auditEvents from './auditEvents'
import invitations from './invitations'
import foundation from './foundation'
import memberships from './memberships'
import organizations from './organizations'
import relationships from './relationships'
import supplierProfiles from './supplierProfiles'
import facilities from './facilities'
import machines from './machines'
import certifications from './certifications'
import productionRecords from './productionRecords'
import supplierAssignments from './supplierAssignments'
import machineAssignments from './machineAssignments'
import productionEvents from './productionEvents'
import productionCollaboration from './productionCollaboration'
import platformAdministration from './platformAdministration'
import confidentiality from './confidentiality'
import internalTasks from './internalTasks'
import tradeShowLeads from './tradeShowLeads'

export default combineReducers({
  auditEvents,
  invitations,
  foundation,
  memberships,
  organizations,
  relationships,
  supplierProfiles,
  facilities,
  machines,
  certifications,
  productionRecords,
  supplierAssignments,
  machineAssignments,
  productionEvents,
  productionCollaboration,
  platformAdministration,
  confidentiality,
  internalTasks,
  tradeShowLeads,
})
