import { CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import FormMessage from '../../auth/FormMessage'
import { Button } from '../../design-system'
import { crmErrorMessage, crmRequest } from '../../../store/crmApi'

const parseCsv = input => {
  const rows = []
  let row = []
  let value = ''
  let quoted = false
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]
    if (character === '"') {
      if (quoted && input[index + 1] === '"') { value += '"'; index += 1 } else quoted = !quoted
    } else if (character === ',' && !quoted) {
      row.push(value); value = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && input[index + 1] === '\n') index += 1
      row.push(value); value = ''
      if (row.some(cell => cell.trim())) rows.push(row)
      row = []
    } else value += character
  }
  row.push(value)
  if (row.some(cell => cell.trim())) rows.push(row)
  return rows
}

const headerKey = value => String(value || '').replace(/^\uFEFF/, '').trim().toLowerCase()
  .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
const splitList = value => String(value || '').split(/[;|]/).map(item => item.trim()).filter(Boolean)
const aliases = {
  company: 'name', company_name: 'name', organization_type: 'type', domain: 'primary_domain',
  source: 'lead_source', contact_role: 'contact_roles', roles: 'contact_roles', role: 'contact_roles',
  organization: 'organization_name', company_id: 'organization', organization_id: 'organization',
  title: 'job_title', first: 'first_name', last: 'last_name',
}
const allowed = {
  organizations: new Set(['name', 'type', 'status', 'industry', 'website', 'primary_domain', 'phone', 'timezone', 'lead_source', 'lead_source_detail', 'notes', 'tags']),
  contacts: new Set(['organization', 'organization_name', 'first_name', 'last_name', 'job_title', 'department', 'email', 'phone', 'contact_roles', 'other_role', 'status', 'timezone', 'notes', 'tags']),
}
const normalizeValue = (key, value) => {
  const cleaned = String(value || '').trim()
  if (['tags', 'contact_roles'].includes(key)) return splitList(cleaned).map(item => item.toLowerCase().replace(/\s+/g, '_'))
  if (['type', 'status'].includes(key)) return cleaned.toLowerCase().replace(/\s+/g, '_')
  return cleaned
}
const rowsForImport = (grid, entity) => {
  if (grid.length < 2) throw new Error('The CSV must include a header row and at least one data row.')
  const headers = grid[0].map(value => aliases[headerKey(value)] || headerKey(value))
  const unsupported = headers.filter(key => key && !allowed[entity].has(key))
  if (unsupported.length) throw new Error(`Unsupported columns: ${[...new Set(unsupported)].join(', ')}`)
  return grid.slice(1).map(cells => Object.fromEntries(headers.flatMap((key, index) => key
    ? [[key, normalizeValue(key, cells[index])]] : [])))
}

const CrmImportPanel = ({ onImported }) => {
  const dispatch = useDispatch()
  const [entity, setEntity] = useState('organizations')
  const [fileName, setFileName] = useState('')
  const [rows, setRows] = useState([])
  const [review, setReview] = useState(null)
  const [working, setWorking] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const choose = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    setFeedback(null); setReview(null); setRows([]); setFileName(file.name)
    try {
      const parsed = rowsForImport(parseCsv(await file.text()), entity)
      setRows(parsed)
      setFeedback({ type: 'success', message: `${parsed.length} rows loaded locally. Run the safety check before importing.` })
    } catch (error) {
      setFeedback({ type: 'error', message: error.message })
    }
  }
  const submit = async dryRun => {
    if (!rows.length) return setFeedback({ type: 'error', message: 'Choose a CSV file first.' })
    setWorking(true); setFeedback(null)
    const result = await dispatch(crmRequest({
      url: `/imports/${entity}`, method: 'post', data: { rows, dry_run: dryRun },
      requestKey: `crm-import-${entity}-${dryRun ? 'review' : 'commit'}`,
    }))
    setWorking(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The import could not be checked.') })
    if (dryRun) {
      const nextReview = result.payload.data
      setReview(nextReview)
      return setFeedback(nextReview.errors?.length
        ? { type: 'error', message: `${nextReview.errors.length} rows need correction. Nothing was imported.` }
        : { type: 'success', message: `All ${nextReview.valid_rows} rows passed. Nothing has been imported yet.` })
    }
    setRows([]); setReview(null); setFileName('')
    setFeedback({ type: 'success', message: `${result.payload.data.imported} ${entity} imported successfully.` })
    onImported?.()
  }
  return <div className='crmImportPanel'>
    <div className='crmImportPanel__controls'>
      <label><span>Record type</span><select value={entity} onChange={event => { setEntity(event.target.value); setRows([]); setReview(null); setFileName(''); setFeedback(null) }}><option value='organizations'>Organizations</option><option value='contacts'>Contacts</option></select></label>
      <label className='crmFilePicker'><span>CSV file</span><input type='file' accept='.csv,text/csv' onChange={choose} /><span><FileSpreadsheet aria-hidden='true' /> {fileName || 'Choose CSV file'}</span></label>
    </div>
    <p className='crmImportPanel__help'>{entity === 'organizations'
      ? 'Required columns: Company name and Type (OEM or Supplier). Optional: Status, Industry, Website, Domain, Phone, Lead source, Notes, Tags.'
      : 'Required columns: Organization, First name, and Last name. Organization may be the exact CRM company name or its ID. Optional: Email, Phone, Title, Department, Roles, Notes, Tags.'}</p>
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    {review?.errors?.length > 0 && <div className='crmImportErrors'><strong>Rows to correct</strong><ul>{review.errors.slice(0, 50).map(item => <li key={item.row}>Row {item.row}: {Object.values(item.errors).join('; ')}</li>)}</ul>{review.errors.length > 50 && <p>Plus {review.errors.length - 50} more errors.</p>}</div>}
    <div className='crmDataActions'>
      <Button variant='secondary' onClick={() => submit(true)} disabled={working || !rows.length}><CheckCircle2 aria-hidden='true' /> Safety check</Button>
      <Button onClick={() => submit(false)} disabled={working || !review || review.errors?.length > 0}><Upload aria-hidden='true' /> Import {review?.valid_rows || 0} checked rows</Button>
    </div>
  </div>
}

export default CrmImportPanel
