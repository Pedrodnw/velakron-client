import axios from 'axios'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardCheck, Download, Eye, FileSpreadsheet, FileUp, GitCompareArrows, LoaderCircle, Paperclip, RefreshCw, Ruler, Send, UserRoundCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import FormMessage from '../auth/FormMessage'
import { resultError } from '../auth/utils'
import { Button } from '../design-system'
import { formatDate, formatDateTime, formatLabel } from './formatters'
import ResponsiveDrawer from './ResponsiveDrawer'
import StatusBadge from './StatusBadge'
import ItarAccessDialog from './ItarAccessDialog'
import {
  commitInspectionImport,
  compareInspectionSubmissions,
  confirmInspectionFailure,
  inspectionSelectors,
  loadInspectionAttachments,
  loadInspectionRun,
  loadInspectionRuns,
  previewInspectionImport,
  recordInspectionResult,
  requestInspectionAttachmentDownload,
  requestInspectionAttachmentView,
  reviewInspectionPackage,
  submitInspectionPackage,
  updateInspectionRunAssignment,
  uploadInspectionEvidence,
} from '../../store/slices/entities/inspection'

const idOf = value => String(value?.id || value?._id || value || '')
const runTone = state => state === 'accepted' ? 'success' : state === 'changes_requested' ? 'danger' : state === 'submitted' ? 'info' : state === 'ready_to_submit' ? 'warning' : 'neutral'
const resultTone = state => state === 'pass' ? 'success' : String(state).startsWith('fail') ? 'danger' : 'neutral'
const actorLabel = (run, organizationType) => run.current_actor_side === 'none' ? 'Complete' : run.current_actor_side === organizationType ? 'Your company owns the next step' : `Waiting on ${formatLabel(run.current_actor_side)}`
const gatePolicyLabel = value => ({ oem_approval_required: 'OEM approval required', completion_required: 'Completion required', submission_required: 'Submission required' }[value] || formatLabel(value))
const alternateAttributeValue = expectation => expectation === 'pass' ? 'fail' : expectation === 'present' ? 'absent' : 'present'
const newImportState = () => ({ open: false, csv: '', file: null, attachmentId: '', preview: null, delimiter: ',', idempotency_key: '', mapping: { header_row: 1, decimal_separator: '.', characteristic: 'characteristic_id', sample: 'sample', value: 'value', unit: 'unit', inspected_at: 'inspected_at', instrument: 'instrument' } })

const ResultEntry = ({ characteristic, sampleNumber, result, pending, onSave, onConfirm, onEvidence, isNext, readOnly = false }) => {
  const [value, setValue] = useState(result?.numeric_value || result?.attribute_value || '')
  const [details, setDetails] = useState({ instrument: result?.instrument || '', lot_serial: result?.lot_serial || '', cavity: result?.cavity || '', operation: result?.operation || '', note: result?.note || '' })
  useEffect(() => { setValue(result?.numeric_value || result?.attribute_value || '') }, [result?.id, result?._id, result?.numeric_value, result?.attribute_value])
  const save = () => onSave({ characteristic_id: idOf(characteristic), sample_key: String(sampleNumber), sample_sequence: sampleNumber, [characteristic.type === 'numeric' ? 'numeric_value' : 'attribute_value']: value, ...details, correction_reason: result ? 'Inspector corrected or refreshed this saved checkpoint.' : '' })
  return <article id={isNext ? 'inspection-next-incomplete' : undefined} className={`inspectionResultRow${result ? ` inspectionResultRow--${result.status}` : ''}${isNext ? ' is-next' : ''}`}>
    <div className='inspectionResultRow__identity'><strong>{characteristic.characteristic_id}</strong><span>Sample {sampleNumber}</span></div>
    <div className='inspectionResultRow__expectation'><strong>{characteristic.title}</strong><span>{characteristic.type === 'numeric' ? `${characteristic.lower_limit}–${characteristic.upper_limit} ${characteristic.unit}` : `Expected ${formatLabel(characteristic.attribute_expectation)}`}</span>{characteristic.evidence_requirements?.length > 0 && <small>{characteristic.evidence_requirements.map(item => `${item.minimum_count} ${formatLabel(item.category)}`).join(' · ')} required</small>}</div>
    <label className='inspectionResultRow__value'><span>Result</span>{characteristic.type === 'numeric' ? <input disabled={readOnly} inputMode='decimal' value={value} onChange={event => setValue(event.target.value)} placeholder={characteristic.nominal_value || 'Measurement'} /> : <select disabled={readOnly} value={value} onChange={event => setValue(event.target.value)}><option value=''>Choose</option><option value={characteristic.attribute_expectation}>{formatLabel(characteristic.attribute_expectation)}</option><option value={alternateAttributeValue(characteristic.attribute_expectation)}>Does not meet</option>{value && ![characteristic.attribute_expectation, alternateAttributeValue(characteristic.attribute_expectation)].includes(value) && <option value={value}>{formatLabel(value)}</option>}</select>}</label>
    <details className='inspectionResultRow__details'><summary>Traceability</summary><div><input disabled={readOnly} aria-label='Instrument' placeholder='Instrument / gage' value={details.instrument} onChange={event => setDetails(current => ({ ...current, instrument: event.target.value }))} /><input disabled={readOnly} aria-label='Lot or serial' placeholder='Lot / serial' value={details.lot_serial} onChange={event => setDetails(current => ({ ...current, lot_serial: event.target.value }))} /><input disabled={readOnly} aria-label='Operation' placeholder='Operation' value={details.operation} onChange={event => setDetails(current => ({ ...current, operation: event.target.value }))} /><input disabled={readOnly} aria-label='Cavity' placeholder='Cavity' value={details.cavity} onChange={event => setDetails(current => ({ ...current, cavity: event.target.value }))} /></div></details>
    <div className='inspectionResultRow__status'>{result ? <StatusBadge tone={resultTone(result.status)}>{formatLabel(result.status)}</StatusBadge> : <StatusBadge tone='neutral'>Not recorded</StatusBadge>}{result?.deviation && result.deviation !== '0' && <small>Deviation {result.deviation}</small>}</div>
    <div className='inspectionResultRow__actions'>{!readOnly && <><Button variant='secondary' onClick={save} disabled={pending || !value}>{result ? 'Correct' : 'Save'}</Button>{result && <label className='inspectionEvidenceButton' title='Attach evidence'><FileUp aria-hidden='true' /><span>Evidence</span><input type='file' onChange={event => event.target.files?.[0] && onEvidence(event.target.files[0], result)} /></label>}{result?.status === 'fail_unconfirmed' && <Button variant='danger' onClick={() => onConfirm(result)}><AlertTriangle aria-hidden='true' /> Confirm failure</Button>}</>}</div>
  </article>
}

const InspectionRunWorkspace = ({ runId, production, organizationType, onClose, onChanged, embedded = false }) => {
  const dispatch = useDispatch()
  const detail = useSelector(inspectionSelectors.getRunDetail(runId))
  const evidence = useSelector(inspectionSelectors.getAttachments(runId))
  const pending = useSelector(inspectionSelectors.getMutating)
  const upload = useSelector(inspectionSelectors.getUpload)
  const [feedback, setFeedback] = useState(null)
  const [declaration, setDeclaration] = useState('I confirm that these inspection results and attached evidence accurately represent the inspected production samples.')
  const [review, setReview] = useState({ decision: 'accepted', note: '', characteristic_ids: [] })
  const [importState, setImportState] = useState(newImportState)
  const [itarExport, setItarExport] = useState(false)
  const [itarEvidence, setItarEvidence] = useState(null)
  const [accessPending, setAccessPending] = useState(false)
  const [resultPage, setResultPage] = useState(1)
  const [assignment, setAssignment] = useState({ assignee_membership_id: '', due_at: '' })
  const [comparison, setComparison] = useState(null)
  useEffect(() => { setResultPage(1); setComparison(null) }, [runId])
  useEffect(() => { if (runId) dispatch(loadInspectionRun(runId, resultPage, 50)) }, [dispatch, runId, resultPage])
  useEffect(() => { if (runId) dispatch(loadInspectionAttachments(runId)) }, [dispatch, runId])
  useEffect(() => {
    const assigned = detail?.run?.assignee_membership
    const due = detail?.run?.due_at ? new Date(detail.run.due_at).toISOString().slice(0, 10) : ''
    setAssignment({ assignee_membership_id: idOf(assigned), due_at: due })
  }, [detail?.run?.id, detail?.run?._id, detail?.run?.assignee_membership?.id, detail?.run?.assignee_membership?._id, detail?.run?.due_at])
  const refresh = async () => { await Promise.all([dispatch(loadInspectionRun(runId, resultPage, 50)), dispatch(loadInspectionAttachments(runId))]); onChanged?.() }
  if (!detail?.run) return <div className='inspectionRunLoading'><LoaderCircle className='spin' aria-hidden='true' /> Loading inspection run…</div>
  const run = detail.run
  const activeIds = new Set(detail.active_result_ids || [])
  const activeResults = (detail.results || []).filter(item => activeIds.has(idOf(item)))
  const canRecord = run.current_actor_side === organizationType && ['not_started', 'in_progress', 'ready_to_submit', 'changes_requested'].includes(run.state)
  const canReview = organizationType === 'oem' && run.current_actor_side === 'oem' && run.state === 'submitted'
  const scope = new Map((run.sample_scope || []).map(item => [idOf(item.characteristic), item.required_count]))
  const characteristicMap = new Map((detail.characteristics || []).map(item => [idOf(item), item]))
  const submission = detail.submissions?.[0]
  const correctionIds = new Set((submission?.correction_characteristics || []).map(idOf))
  const correctionLabels = (detail.characteristics || []).filter(item => correctionIds.has(idOf(item))).map(item => item.characteristic_id)
  const rows = detail.result_slots?.length
    ? detail.result_slots.map(slot => ({ characteristic: characteristicMap.get(String(slot.characteristic_id)), sampleNumber: slot.sample_number, result: slot.result || null })).filter(item => item.characteristic)
    : (detail.characteristics || []).filter(item => scope.has(idOf(item))).flatMap(characteristic => Array.from({ length: scope.get(idOf(characteristic)) || 1 }, (_, index) => ({ characteristic, sampleNumber: index + 1, result: activeResults.find(item => idOf(item.inspection_characteristic) === idOf(characteristic) && item.sample_key === String(index + 1)) })))
  const nextIncompleteIndex = rows.findIndex(row => !row.result)
  const action = async (operation, success) => { setFeedback(null); const result = await operation(); if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The inspection update could not be saved.') }); else { setFeedback({ type: 'success', message: success }); await refresh() } return result }
  const confirmFailure = result => {
    const affected = window.prompt('How many parts may be affected?', '1'); if (!affected) return
    const containment = window.prompt('Describe the immediate containment or next action.'); if (!containment) return
    action(() => dispatch(confirmInspectionFailure(idOf(result), { affected_quantity: Number(affected), containment })), 'Non-conformance opened and linked to this exact inspection result.')
  }
  const readCsv = file => { const reader = new FileReader(); reader.onload = () => setImportState(current => ({ ...current, csv: String(reader.result || ''), file, attachmentId: '', preview: null, idempotency_key: `csv:${runId}:${file.name}:${file.size}:${file.lastModified}` })); reader.readAsText(file) }
  const previewCsv = async () => {
    let attachmentId = importState.attachmentId
    if (importState.file && !attachmentId) {
      const uploadResult = await dispatch(uploadInspectionEvidence(runId, { file: importState.file, category: 'cmm_report' }))
      if (!uploadResult?.ok) { setFeedback({ type: 'error', message: resultError(uploadResult, 'The source CMM report could not be stored.') }); return }
      attachmentId = idOf(uploadResult.payload?.data?.attachment)
      setImportState(current => ({ ...current, attachmentId }))
    }
    const result = await dispatch(previewInspectionImport(runId, { csv_text: importState.csv, delimiter: importState.delimiter, idempotency_key: importState.idempotency_key || `csv:${runId}:${Date.now()}`, source_attachment_id: attachmentId || undefined, mapping: importState.mapping }))
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The CSV could not be previewed.') })
    else setImportState(current => ({ ...current, preview: result.payload.data }))
  }
  const downloadPdf = async (attestation = {}) => {
    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/inspection/submissions/${idOf(submission)}/export`, attestation, { withCredentials: true, responseType: 'blob' })
      const target = window.URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = target; link.download = `inspection-package-v${submission.submission_number}.pdf`; document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(target)
      setItarExport(false)
      return { ok: true }
    } catch { setFeedback({ type: 'error', message: 'The protected package export could not be downloaded.' }); return { ok: false } }
  }
  const downloadTemplate = () => {
    const first = rows[0]?.characteristic
    const csv = `characteristic_id,sample,value,unit,inspected_at,instrument\n${first?.characteristic_id || 'C001'},1,${first?.nominal_value || ''},${first?.unit || 'inch'},${new Date().toISOString()},`
    const target = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = target; link.download = 'velakron-inspection-import-template.csv'; document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(target)
  }
  const downloadImportErrors = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/inspection/imports/${idOf(importState.preview?.import_record)}/errors.csv`, { withCredentials: true, responseType: 'blob' })
      const target = window.URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = target; link.download = 'inspection-import-errors.csv'; document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(target)
    } catch { setFeedback({ type: 'error', message: 'The row-error report could not be downloaded.' }) }
  }
  const saveAssignment = () => action(
    () => dispatch(updateInspectionRunAssignment(runId, { assignee_membership_id: assignment.assignee_membership_id || null, due_at: assignment.due_at || null })),
    'Inspection responsibility updated.',
  )
  const goToNextIncomplete = () => {
    if (nextIncompleteIndex >= 0) {
      document.getElementById('inspection-next-incomplete')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      document.querySelector('#inspection-next-incomplete input, #inspection-next-incomplete select')?.focus()
      return
    }
    if (detail.result_pagination?.page < detail.result_pagination?.pages) setResultPage(page => page + 1)
  }
  const compareSubmission = async item => {
    setFeedback(null)
    const result = await dispatch(compareInspectionSubmissions(idOf(item)))
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The package versions could not be compared.') })
    else setComparison(result.payload?.data || null)
  }
  const accessEvidence = async (attachment, purpose, attestation = null) => {
    if (production.export_control === 'itar' && !attestation) {
      setItarEvidence({ attachment, purpose })
      return null
    }
    setAccessPending(true)
    const operation = purpose === 'view' ? requestInspectionAttachmentView : requestInspectionAttachmentDownload
    const result = await dispatch(operation(runId, idOf(attachment), attestation || {}))
    setAccessPending(false)
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The protected inspection evidence could not be opened.') })
    else setItarEvidence(null)
    return result
  }
  const evidenceLabel = attachment => {
    if (attachment.subject_type !== 'InspectionResult') return formatLabel(attachment.category)
    const linkedResult = activeResults.find(item => idOf(item) === idOf(attachment.subject_id))
    const linkedCharacteristic = linkedResult && characteristicMap.get(idOf(linkedResult.inspection_characteristic))
    return linkedCharacteristic ? `${linkedCharacteristic.characteristic_id} · Sample ${linkedResult.sample_key}` : 'Inspection checkpoint evidence'
  }
  return <div className='inspectionRunWorkspace'>
    <header className='inspectionRunWorkspace__header'><div><p className='technicalLabel'>{formatLabel(run.kind)} inspection</p><h2>{production.part_number} · {run.completed_results} of {run.required_results}</h2><p>{actorLabel(run, organizationType)}</p>{embedded && <small>The released definition and every inspection stage remain visible in the production record behind this panel.</small>}</div><div><StatusBadge tone={runTone(run.state)}>{formatLabel(run.state)}</StatusBadge><Button variant='secondary' onClick={refresh}><RefreshCw aria-hidden='true' /> Refresh</Button></div></header>
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    <div className='inspectionCompletion'><progress max={Math.max(run.required_results, 1)} value={run.completed_results} /><span>{run.pass_count} pass · {run.fail_count} confirmed failure{run.fail_count === 1 ? '' : 's'} · {run.unconfirmed_failure_count} need confirmation</span></div>
    {canRecord && <details className='inspectionAssignment'><summary><UserRoundCheck aria-hidden='true' /> Responsibility and due date</summary><div><label><span>Assignee</span><select value={assignment.assignee_membership_id} onChange={event => setAssignment(current => ({ ...current, assignee_membership_id: event.target.value }))}><option value=''>Company quality queue</option>{(detail.assignment_options || []).map(option => <option key={option.id} value={option.id}>{option.name} · {formatLabel(option.role)}</option>)}</select></label><label><span>Due date</span><input type='date' value={assignment.due_at} onChange={event => setAssignment(current => ({ ...current, due_at: event.target.value }))} /></label><Button variant='secondary' onClick={saveAssignment}>Save responsibility</Button></div></details>}
    {run.active_nonconformances?.length > 0 && <div className='inspectionNcrBanner'><AlertTriangle aria-hidden='true' /><div><strong>{run.active_nonconformances.length} linked non-conformance workflow{run.active_nonconformances.length === 1 ? '' : 's'}</strong><p>The original failed result remains immutable while corrective action continues in production attention.</p></div></div>}
    {run.state === 'changes_requested' && submission && <section className='inspectionCorrectionNotice' aria-label='Requested inspection corrections'><AlertTriangle aria-hidden='true' /><div><p className='technicalLabel'>OEM review returned this package</p><h3>Corrections requested{correctionLabels.length ? ` for ${correctionLabels.join(', ')}` : ''}</h3><p>{submission.review_note || 'Review the selected checkpoints, make the requested corrections, and submit a new immutable package version.'}</p><small>Reviewed {formatDateTime(submission.reviewed_at)}{submission.reviewed_by?.user_name ? ` by ${submission.reviewed_by.user_name}` : ''}</small></div></section>}
    {canRecord && <div className='inspectionExecutionToolbar'><div><strong>Record checkpoints</strong><p>Velakron evaluates every value against the released limits on the server.</p></div><div><Button variant='secondary' onClick={goToNextIncomplete} disabled={nextIncompleteIndex < 0 && detail.result_pagination?.page >= detail.result_pagination?.pages}><ArrowRight aria-hidden='true' /> Next incomplete</Button><Button variant='secondary' onClick={() => setImportState(current => ({ ...current, open: !current.open }))}><FileSpreadsheet aria-hidden='true' /> Import CMM CSV</Button></div></div>}
    {importState.open && <section className='inspectionImportPanel'><header><div><p className='technicalLabel'>Normalized CMM import</p><h3>Preview before creating results</h3><p>The original CSV is stored with the run. Unsupported CMM formats can still be attached to individual checkpoints as evidence.</p></div><Button variant='secondary' onClick={downloadTemplate}><Download aria-hidden='true' /> Download template</Button></header><label className='inspectionEvidenceButton'><FileSpreadsheet aria-hidden='true' /><span>{importState.file?.name || 'Choose CSV file'}</span><input type='file' accept='.csv,text/csv' onChange={event => event.target.files?.[0] && readCsv(event.target.files[0])} /></label><details className='inspectionImportMapping'><summary>CSV layout and column mapping</summary><div><label><span>Delimiter</span><select value={importState.delimiter} onChange={event => setImportState(current => ({ ...current, delimiter: event.target.value }))}><option value=','>Comma</option><option value=';'>Semicolon</option><option value={'\t'}>Tab</option></select></label><label><span>Header row</span><input type='number' min='1' max='50' value={importState.mapping.header_row} onChange={event => setImportState(current => ({ ...current, mapping: { ...current.mapping, header_row: event.target.value } }))} /></label><label><span>Decimal separator</span><select value={importState.mapping.decimal_separator} onChange={event => setImportState(current => ({ ...current, mapping: { ...current.mapping, decimal_separator: event.target.value } }))}><option value='.'>Period</option><option value=','>Comma</option></select></label>{['characteristic', 'sample', 'value', 'unit', 'inspected_at', 'instrument'].map(column => <label key={column}><span>{formatLabel(column)} column</span><input value={importState.mapping[column]} onChange={event => setImportState(current => ({ ...current, mapping: { ...current.mapping, [column]: event.target.value } }))} /></label>)}</div></details>{importState.csv && <Button onClick={previewCsv}>Store report & preview rows</Button>}{importState.preview && <><div className='inspectionImportSummary'><p>{importState.preview.import_record.accepted_count} accepted · {importState.preview.import_record.rejected_count} rejected</p>{importState.preview.import_record.rejected_count > 0 && <Button variant='secondary' onClick={downloadImportErrors}><Download aria-hidden='true' /> Download row errors</Button>}</div><div className='inspectionImportRows'>{importState.preview.rows.slice(0, 25).map(row => <div key={`${row.row}-${row.characteristic_id}`}><span>Row {row.row}</span><strong>{row.characteristic_id || 'No ID'}</strong><StatusBadge tone={row.accepted ? resultTone(row.evaluation?.status) : 'danger'}>{row.accepted ? formatLabel(row.evaluation?.status) : row.errors.join(', ')}</StatusBadge></div>)}</div><Button disabled={!importState.preview.import_record.accepted_count} onClick={() => action(() => dispatch(commitInspectionImport(idOf(importState.preview.import_record))), 'CMM results imported with source-row provenance.').then(result => result?.ok && setImportState(newImportState()))}>Commit valid rows</Button></>}</section>}
    <div className='inspectionResultTable' role='table' aria-label='Inspection checkpoints'>{rows.map((row, index) => <ResultEntry key={`${idOf(row.characteristic)}-${row.sampleNumber}`} {...row} isNext={index === nextIncompleteIndex} readOnly={!canRecord} pending={pending} onSave={payload => action(() => dispatch(recordInspectionResult(runId, payload)), 'Inspection result saved and evaluated.')} onConfirm={confirmFailure} onEvidence={(file, result) => action(() => dispatch(uploadInspectionEvidence(runId, { file, resultId: idOf(result) })), 'Protected evidence uploaded and linked to this result.')} />)}</div>
    {detail.result_pagination?.pages > 1 && <nav className='inspectionResultPagination' aria-label='Inspection result pages'><Button variant='secondary' disabled={detail.result_pagination.page <= 1} onClick={() => setResultPage(page => page - 1)}><ArrowLeft aria-hidden='true' /> Previous</Button><span>Checkpoints {(detail.result_pagination.page - 1) * detail.result_pagination.page_size + 1}–{Math.min(detail.result_pagination.page * detail.result_pagination.page_size, detail.result_pagination.total)} of {detail.result_pagination.total}</span><Button variant='secondary' disabled={detail.result_pagination.page >= detail.result_pagination.pages} onClick={() => setResultPage(page => page + 1)}>Next <ArrowRight aria-hidden='true' /></Button></nav>}
    {upload && <p className='uploadProgress'><LoaderCircle className='spin' aria-hidden='true' /> {upload.filename} · {upload.progress}%</p>}
    <section className='inspectionEvidenceInventory'>
      <header><div><p className='technicalLabel'>Traceable evidence</p><h3>Inspection files</h3><p>Source reports and checkpoint evidence shared with both companies.</p></div><span>{evidence.pagination?.total || 0} file{evidence.pagination?.total === 1 ? '' : 's'}</span></header>
      {evidence.attachments?.length ? <div>{evidence.attachments.map(attachment => <article key={idOf(attachment)}><Paperclip aria-hidden='true' /><div><strong>{attachment.display_filename || attachment.original_filename}</strong><span>{evidenceLabel(attachment)} · {Math.max(1, Math.round((attachment.byte_size || 0) / 1024))} KB</span></div><StatusBadge tone={attachment.state === 'available' ? 'success' : attachment.state === 'quarantined' ? 'danger' : 'warning'}>{formatLabel(attachment.state)}</StatusBadge><div><Button variant='secondary' disabled={attachment.state !== 'available' || accessPending} onClick={() => accessEvidence(attachment, 'view')}><Eye aria-hidden='true' /> Open</Button><Button variant='secondary' disabled={attachment.state !== 'available' || accessPending} onClick={() => accessEvidence(attachment, 'download')}><Download aria-hidden='true' /> Download</Button></div></article>)}</div> : <div className='inspectionEvidenceInventory__empty'><Paperclip aria-hidden='true' /><p>No evidence has been uploaded for this inspection yet.</p></div>}
    </section>
    {canRecord && ['ready_to_submit', 'changes_requested'].includes(run.state) && <section className='inspectionSubmissionPanel'><ClipboardCheck aria-hidden='true' /><div><strong>Checkpoint results are complete</strong><p>{run.state === 'changes_requested' ? 'Velakron will verify the requested evidence and create a new immutable version for OEM review.' : 'Velakron will verify required evidence, freeze this result version, and route it to the OEM reviewer.'}</p><textarea aria-label='Inspection package declaration' value={declaration} onChange={event => setDeclaration(event.target.value)} rows={3} /></div><Button onClick={() => action(() => dispatch(submitInspectionPackage(runId, declaration)), 'Inspection package submitted to the OEM.')}><Send aria-hidden='true' /> {run.state === 'changes_requested' ? 'Validate & submit correction' : 'Validate & submit package'}</Button></section>}
    {canReview && submission && <section className='inspectionReviewPanel'><div><p className='technicalLabel'>OEM formal decision</p><h3>Review package version {submission.submission_number}</h3><p>Accept the exact package hash or return selected checkpoints for correction.</p></div><label><span>Decision</span><select value={review.decision} onChange={event => setReview(current => ({ ...current, decision: event.target.value }))}><option value='accepted'>Accept package</option><option value='changes_requested'>Request changes</option></select></label>{review.decision === 'changes_requested' && <div className='inspectionReviewChecklist'>{detail.characteristics.filter(item => scope.has(idOf(item))).map(item => <label key={idOf(item)}><input type='checkbox' checked={review.characteristic_ids.includes(idOf(item))} onChange={event => setReview(current => ({ ...current, characteristic_ids: event.target.checked ? [...current.characteristic_ids, idOf(item)] : current.characteristic_ids.filter(id => id !== idOf(item)) }))} /> {item.characteristic_id} · {item.title}</label>)}</div>}<textarea value={review.note} onChange={event => setReview(current => ({ ...current, note: event.target.value }))} placeholder={review.decision === 'accepted' ? 'Optional acceptance note' : 'Explain the required corrections'} rows={3} /><Button variant={review.decision === 'accepted' ? 'primary' : 'danger'} onClick={() => action(() => dispatch(reviewInspectionPackage(idOf(submission), review)), review.decision === 'accepted' ? 'Inspection package accepted.' : 'Corrections returned to the inspector.')}><Check aria-hidden='true' /> Record decision</Button></section>}
    {submission && <section className='inspectionPackageHistory'><header><div><p className='technicalLabel'>Immutable packages</p><h3>Submission history</h3></div><Button variant='secondary' onClick={() => production.export_control === 'itar' ? setItarExport(true) : downloadPdf()}><Download aria-hidden='true' /> Download current PDF</Button></header>{detail.submissions.map(item => <article key={idOf(item)}><div><strong>Version {item.submission_number}</strong><span>{formatDateTime(item.submitted_at)}</span></div><StatusBadge tone={runTone(item.state)}>{formatLabel(item.state)}</StatusBadge><code>{item.manifest_hash.slice(0, 16)}…</code>{item.submission_number > 1 && <Button variant='secondary' onClick={() => compareSubmission(item)}><GitCompareArrows aria-hidden='true' /> Compare</Button>}{item.review_note && <p className='inspectionPackageHistory__review'><strong>OEM review:</strong> {item.review_note}{item.reviewed_by?.user_name ? ` — ${item.reviewed_by.user_name}` : ''}</p>}</article>)}{comparison && <div className='inspectionSubmissionComparison'><header><div><p className='technicalLabel'>Version comparison</p><strong>Version {comparison.previous.submission_number} → {comparison.current.submission_number}</strong></div><Button variant='secondary' onClick={() => setComparison(null)}>Close</Button></header>{comparison.changes.length ? <div>{comparison.changes.map(change => <article key={change.key}><span>{change.characteristic_id} · Sample {change.sample_key}</span><strong>{change.before?.numeric_value || change.before?.attribute_value || 'Not present'} → {change.after?.numeric_value || change.after?.attribute_value || 'Removed'}</strong><small>{change.changed_fields.map(formatLabel).join(', ')}</small></article>)}</div> : <p>No measurement, result, traceability, or evidence changes were found.</p>}</div>}</section>}
    <footer><Button variant='secondary' onClick={onClose}>Close</Button></footer>
    <ItarAccessDialog file={{ display_filename: `Inspection package v${submission?.submission_number || ''}.pdf` }} purpose='download' open={itarExport} pending={pending} feedback={feedback?.type === 'error' ? feedback : null} onClose={() => setItarExport(false)} onConfirm={downloadPdf} />
    <ItarAccessDialog file={itarEvidence?.attachment} purpose={itarEvidence?.purpose} open={Boolean(itarEvidence)} pending={accessPending} feedback={feedback?.type === 'error' ? feedback : null} onClose={() => { if (!accessPending) setItarEvidence(null) }} onConfirm={attestation => accessEvidence(itarEvidence.attachment, itarEvidence.purpose, attestation)} />
  </div>
}

const InspectionQualityPanel = ({ production, organizationType, embedded = false }) => {
  const dispatch = useDispatch()
  const runs = useSelector(inspectionSelectors.getRuns(production.id))
  const loading = useSelector(inspectionSelectors.getLoading)
  const [selectedRun, setSelectedRun] = useState('')
  const refresh = () => dispatch(loadInspectionRuns(production.id))
  useEffect(() => { if (production.id && production.inspection_plan) refresh() }, [dispatch, production.id, production.inspection_plan])
  if (!production.inspection_plan) return null
  return <section className='appPanel inspectionQualityPanel'>
    <header className='appPanel__header'><div><p className='technicalLabel'>Collaborative inspection & quality</p><h2>Inspection plan execution</h2><p>Structured checkpoints, evidence, package review, and quality gates tied to this production record.</p></div><Button variant='secondary' onClick={refresh}><RefreshCw aria-hidden='true' /> Refresh</Button></header>
    {loading && !runs.length ? <p>Loading inspections…</p> : <div className='inspectionRunCards'>{runs.map(run => { const assignee = run.assignee_membership?.user; const assigneeName = [assignee?.first_name, assignee?.last_name].filter(Boolean).join(' '); return <article key={idOf(run)} className={`inspectionRunCard inspectionRunCard--${run.state}`}><div className='inspectionRunCard__icon'>{run.fail_count || run.unconfirmed_failure_count ? <AlertTriangle aria-hidden='true' /> : run.state === 'accepted' ? <CheckCircle2 aria-hidden='true' /> : <Ruler aria-hidden='true' />}</div><div><p className='technicalLabel'>{formatLabel(run.kind)}</p><h3>{formatLabel(run.state)}</h3><p>{actorLabel(run, organizationType)}</p><progress max={Math.max(run.required_results, 1)} value={run.completed_results} /><small>{run.completed_results}/{run.required_results} results · {run.pass_count} pass · {run.fail_count + run.unconfirmed_failure_count} finding{run.fail_count + run.unconfirmed_failure_count === 1 ? '' : 's'}</small></div><div><StatusBadge tone={runTone(run.state)}>{gatePolicyLabel(run.gate_policy)}</StatusBadge>{assigneeName && <span>Assigned to {assigneeName}</span>}{run.due_at && <span>Due {formatDate(run.due_at)}</span>}<Button onClick={() => setSelectedRun(idOf(run))}>{run.current_actor_side === organizationType ? 'Continue inspection' : 'Review details'}</Button></div></article> })}</div>}
    {!loading && !runs.length && <div className='partWorkspaceEmpty'><ClipboardCheck aria-hidden='true' /><h3>No inspection runs were provisioned</h3><p>The linked released plan may not include a checkpoint for this production workflow.</p></div>}
    <ResponsiveDrawer wide open={Boolean(selectedRun)} title='Inspection & quality workspace' onClose={() => setSelectedRun('')}><InspectionRunWorkspace runId={selectedRun} production={production} organizationType={organizationType} embedded={embedded} onClose={() => setSelectedRun('')} onChanged={refresh} /></ResponsiveDrawer>
  </section>
}

export default InspectionQualityPanel
