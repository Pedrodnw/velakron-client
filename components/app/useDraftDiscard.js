import { useState } from 'react'
import { createPortal } from 'react-dom'
import ConfirmationDialog from './ConfirmationDialog'

export default function useDraftDiscard() {
  const [request, setRequest] = useState(null)
  const requestDiscard = (dirty, proceed) => {
    if (!dirty) return proceed()
    setRequest({ proceed })
    return false
  }
  const discardDialog = request && typeof document !== 'undefined' ? createPortal(
    <ConfirmationDialog
      open
      title='Discard unsaved changes?'
      description='Your unsent text and selections will be lost.'
      confirmLabel='Discard draft'
      cancelLabel='Keep editing'
      danger
      onClose={() => setRequest(null)}
      onConfirm={() => { setRequest(null); request.proceed() }}
    />,
    document.querySelector('.appLayout') || document.body,
  ) : null
  return { requestDiscard, discardDialog }
}
