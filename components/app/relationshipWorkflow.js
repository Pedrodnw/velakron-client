export const RELATIONSHIP_ACTIONS = Object.freeze({
  NONE: 'none',
  SUPPLIER_DECISION: 'supplier_decision',
  SUPPLIER_ADMIN_REQUIRED: 'supplier_admin_required',
  WAITING_FOR_SUPPLIER: 'waiting_for_supplier',
})

export const relationshipActionFor = ({ organizationType, status, canManage }) => {
  if (status !== 'pending_supplier') return RELATIONSHIP_ACTIONS.NONE
  if (organizationType === 'supplier') {
    return canManage
      ? RELATIONSHIP_ACTIONS.SUPPLIER_DECISION
      : RELATIONSHIP_ACTIONS.SUPPLIER_ADMIN_REQUIRED
  }
  if (organizationType === 'oem') return RELATIONSHIP_ACTIONS.WAITING_FOR_SUPPLIER
  return RELATIONSHIP_ACTIONS.NONE
}

export const relationshipStatusLabel = ({ organizationType, status }) => {
  if (status !== 'pending_supplier') return null
  return organizationType === 'supplier' ? 'Your approval required' : 'Awaiting supplier'
}
