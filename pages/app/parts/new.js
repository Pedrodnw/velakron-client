import { ArrowLeft, Box, FileCheck2, ListChecks, LoaderCircle, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import { AppPageHeader, PermissionDenied } from '../../../components/app'
import PortalPageLayout from '../../../components/app/PortalPageLayout'
import FormField from '../../../components/auth/FormField'
import FormMessage from '../../../components/auth/FormMessage'
import { resultError } from '../../../components/auth/utils'
import Seo from '../../../components/Seo'
import { Button } from '../../../components/design-system'
import { getActiveOrganization, getFeatureEnabled, getHasPermission } from '../../../store/slices/appContext'
import { createPart } from '../../../store/slices/entities/parts'

const initial = { part_number: '', name: '', description: '', revision: 'A', material: '', finish: '', process_summary: '', engineering_note: '', export_control: 'none' }

const NewPartWorkspace = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const organization = useSelector(getActiveOrganization)
  const allowed = useSelector(getHasPermission('part.create'))
  const enabled = useSelector(getFeatureEnabled('part_workspaces'))
  const [form, setForm] = useState(initial)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  if (!enabled || !allowed || organization?.type !== 'oem') return <PermissionDenied />

  const submit = async event => {
    event.preventDefault()
    setPending(true); setFeedback(null)
    const result = await dispatch(createPart(form))
    setPending(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: resultError(result, 'The Part Workspace could not be created.') })
    const id = result.payload?.data?.part?.id
    if (id) router.push(`/app/parts/${id}`)
  }

  return <>
    <Seo title='New part workspace' description='Create a revisioned technical workspace.' path='/app/parts/new' noIndex />
    <Button href='/app/parts' variant='secondary' className='backButton'><ArrowLeft aria-hidden='true' /> Part workspaces</Button>
    <AppPageHeader eyebrow='Technical definition' title='Create a part workspace' description='Start with the part identity and first draft revision. Files and requirements are added before the revision is released.' />
    <form className='appPanel partWorkspaceCreate' onSubmit={submit}>
      <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
      <header><span className='partWorkspaceCreate__icon'><Box aria-hidden='true' /></span><div><p className='technicalLabel'>Part identity</p><h2>Define the source of truth</h2><p>One workspace follows this part through future revisions and production records.</p></div></header>
      <div className='partWorkspaceCreateProgress' aria-label='Workspace creation steps'><span className='is-active'><b>1</b><small>Identity</small></span><span><b>2</b><small>Definition</small></span><span><b>3</b><small>Build draft</small></span></div>
      <fieldset className='partWorkspaceCreateSection'><legend><Box aria-hidden='true' /><span><strong>Part identity</strong><small>Required identifiers that remain consistent across revisions.</small></span></legend><div className='productionFormGrid'><FormField id='part-number' label='Part number' value={form.part_number} onChange={event => set('part_number', event.target.value)} required /><FormField id='part-name' label='Part name' value={form.name} onChange={event => set('name', event.target.value)} required /><FormField id='part-revision' label='Initial revision' value={form.revision} onChange={event => set('revision', event.target.value)} required /></div><label className='textAreaField' htmlFor='part-description'><span>Part description</span><textarea id='part-description' value={form.description} onChange={event => set('description', event.target.value)} maxLength={3000} placeholder='Describe what the part is and where it is used' /></label></fieldset>
      <fieldset className='partWorkspaceCreateSection'><legend><ListChecks aria-hidden='true' /><span><strong>Initial technical definition</strong><small>This metadata starts revision {form.revision || 'A'} and can be refined while it remains a draft.</small></span></legend><div className='productionFormGrid'><FormField id='part-material' label='Material' value={form.material} onChange={event => set('material', event.target.value)} /><FormField id='part-finish' label='Finish / coating' value={form.finish} onChange={event => set('finish', event.target.value)} /><FormField id='part-process' label='Process summary' value={form.process_summary} onChange={event => set('process_summary', event.target.value)} /></div><label className='textAreaField' htmlFor='part-engineering-note'><span>Engineering note for this revision</span><textarea id='part-engineering-note' value={form.engineering_note} onChange={event => set('engineering_note', event.target.value)} maxLength={4000} placeholder='Explain the intent or change represented by this revision' /></label></fieldset>
      <fieldset className='partWorkspaceCreateSection'><legend><ShieldAlert aria-hidden='true' /><span><strong>Data classification</strong><small>Confirm the handling rules before technical files are added.</small></span></legend><label className={`productionCheck itarClassificationControl${form.export_control === 'itar' ? ' is-selected' : ''}`}><input type='checkbox' checked={form.export_control === 'itar'} onChange={event => set('export_control', event.target.checked ? 'itar' : 'none')} /><ShieldAlert aria-hidden='true' /><span><strong>This revision contains ITAR-controlled technical data</strong><small>Files inherit ITAR protection and require a fresh access confirmation every time they are opened or downloaded.</small></span></label></fieldset>
      <div className='partWorkspaceCreateNext'><FileCheck2 aria-hidden='true' /><span><strong>What happens next?</strong><small>Velakron creates a private draft. You will add files and requirements, review the package, then deliberately release and share it.</small></span></div>
      <footer><Button href='/app/parts' variant='secondary'>Cancel</Button><Button type='submit' disabled={pending}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <Box aria-hidden='true' />} Create workspace</Button></footer>
    </form>
  </>
}

NewPartWorkspace.getLayout = PortalPageLayout
export default NewPartWorkspace
