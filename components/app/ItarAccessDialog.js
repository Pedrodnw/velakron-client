import { AlertTriangle, LoaderCircle, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import FormMessage from '../auth/FormMessage'
import { Button } from '../design-system'
import ResponsiveDrawer from './ResponsiveDrawer'

export const ITAR_ACCESS_STATEMENT_VERSION = 'itar-access-v1'

const ItarAccessDialog = ({ file, purpose, open, pending, feedback, onClose, onConfirm }) => {
  const [usPersonConfirmed, setUsPersonConfirmed] = useState(false)
  const [handlingAcknowledged, setHandlingAcknowledged] = useState(false)

  useEffect(() => {
    if (!open) return
    setUsPersonConfirmed(false)
    setHandlingAcknowledged(false)
  }, [file?.id, open, purpose])

  const label = purpose === 'view' ? 'Open protected model' : 'Download protected file'
  return <ResponsiveDrawer open={open} title='ITAR-controlled technical data' onClose={onClose}>
    <form className='itarAccessDialog' onSubmit={event => {
      event.preventDefault()
      onConfirm({
        statement_version: ITAR_ACCESS_STATEMENT_VERSION,
        us_person_confirmed: usPersonConfirmed,
        itar_handling_acknowledged: handlingAcknowledged,
      })
    }}>
      <div className='itarAccessDialog__warning'><ShieldAlert aria-hidden='true' /><div><p className='technicalLabel'>Access confirmation required</p><h3>{file?.display_filename || file?.original_filename}</h3><p>This file is part of an ITAR-controlled production record. Velakron records this confirmation in the access audit trail.</p></div></div>
      {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
      <label className='productionCheck itarAccessDialog__check'><input type='checkbox' checked={usPersonConfirmed} onChange={event => setUsPersonConfirmed(event.target.checked)} /><span><strong>I confirm that I am an authorized U.S. person</strong><small>For this confirmation, “U.S. person” follows 22 C.F.R. § 120.62 and can include a U.S. citizen, lawful permanent resident, or other protected individual—not only a citizen.</small></span></label>
      <label className='productionCheck itarAccessDialog__check'><input type='checkbox' checked={handlingAcknowledged} onChange={event => setHandlingAcknowledged(event.target.checked)} /><span><strong>I understand this is ITAR-controlled technical data</strong><small>I will use it only for the authorized manufacturing work, prevent access by foreign or unauthorized persons, and will not export, retransfer, copy, or disclose it except as authorized.</small></span></label>
      <div className='itarAccessDialog__notice'><AlertTriangle aria-hidden='true' /><p>Do not continue from a shared device, public location, or anywhere an unauthorized person can see the screen or receive the file.</p></div>
      <div className='itarAccessDialog__actions'><Button type='button' variant='secondary' onClick={onClose} disabled={pending}>Cancel</Button><Button type='submit' disabled={pending || !usPersonConfirmed || !handlingAcknowledged}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <ShieldAlert aria-hidden='true' />} {label}</Button></div>
    </form>
  </ResponsiveDrawer>
}

export default ItarAccessDialog
