import { useState } from 'react'
import { LoaderCircle, RefreshCw } from 'lucide-react'
import FormField from '../auth/FormField'
import FormMessage from '../auth/FormMessage'
import { Button } from '../design-system'
import { productionStageChoices } from './productionStageChoices'
import styles from './ProductionStageForm.module.scss'

const ProductionStageForm = ({ record, workflow, actorType, pending, feedback, onSubmit }) => {
  const { current, next, advance, skips, backward } = productionStageChoices(workflow, record, actorType)
  const targets = [advance, ...skips, ...backward].filter(Boolean)
  const [selection, setSelection] = useState(null)
  const stepId = selection ?? advance?.id ?? ''
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [shipmentDate, setShipmentDate] = useState('')
  const target = targets.find(item => item.id === stepId)
  const goingBack = backward.some(item => item.id === stepId)
  const skipping = skips.some(item => item.id === stepId)
  const reasonNeeded = goingBack || skipping
  const option = stage => <option key={stage.id} value={stage.id}>{stage.label}{stage.skippable ? ' (optional)' : ''}</option>

  return <form className='drawerForm' onSubmit={event => {
    event.preventDefault()
    if (!target || pending) return
    onSubmit({ stage: target.key, workflow_step_id: target.id, reason, note, shipment_date: target.key === 'shipped' ? shipmentDate : undefined, version: record.version, idempotency_key: `stage-${Date.now()}-${Math.random().toString(36).slice(2)}` })
  }}>
    <div className={styles.route}>
      <p>Current stage <strong>{current?.label || 'Unavailable'}</strong></p>
      {next ? <p>Next stage <strong>{next.label}</strong>{next.owner !== actorType && <span>{next.owner === 'oem' ? 'OEM action' : next.owner === 'supplier' ? 'Supplier action' : 'Automatic step'}</span>}</p> : <p>No next stage is available.</p>}
    </div>
    <p>Follow the route selected by the OEM. Required stages cannot be skipped. Returning to an earlier stage requires an explanation.</p>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <label className='selectField' htmlFor='next-stage'><span>New production stage</span><select id='next-stage' value={target ? stepId : ''} onChange={event => setSelection(event.target.value)} required>
      <option value='' disabled>Choose a stage</option>
      {advance && <option value={advance.id}>{advance.label} — Next stage{advance.skippable ? ' (optional)' : ''}</option>}
      {!!skips.length && <optgroup label='Skip optional stages — explanation required'>{skips.map(option)}</optgroup>}
      {!!backward.length && <optgroup label='Return to an earlier stage — explanation required'>{backward.map(option)}</optgroup>}
    </select></label>
    {target?.key === 'shipped' && <FormField id='shipment-date' label='Shipment date' type='date' value={shipmentDate} onInput={event => setShipmentDate(event.target.value)} onBlur={event => setShipmentDate(event.target.value)} required />}
    {reasonNeeded && <p role='status'>{goingBack ? `This returns production to ${target.label}. Explain why the earlier stage needs to be repeated.` : 'Explain why the optional stages are being skipped.'}</p>}
    <label className='textAreaField' htmlFor='stage-reason'><span>{reasonNeeded ? 'Required explanation' : 'Optional reason'}</span><textarea id='stage-reason' value={reason} onChange={event => setReason(event.target.value)} minLength={reasonNeeded ? 8 : undefined} maxLength={1000} required={reasonNeeded} /></label>
    <label className='textAreaField' htmlFor='stage-note'><span>Optional shared note</span><textarea id='stage-note' value={note} onChange={event => setNote(event.target.value)} maxLength={2000} /></label>
    <Button type='submit' disabled={pending || !target}>{pending ? <><LoaderCircle className='spin' aria-hidden='true' /> Saving…</> : <><RefreshCw aria-hidden='true' /> {target && target.id === advance?.id ? `Advance to ${target.label}` : 'Update production stage'}</>}</Button>
  </form>
}

export default ProductionStageForm
