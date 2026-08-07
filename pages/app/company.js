import { ArrowRight, Building2, CheckCircle2, LoaderCircle, Save, Send } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader,
  AppSkeleton,
  ChoiceGrid,
  ErrorState,
  OnboardingProgress,
  PermissionDenied,
  SupplierStateNotice,
} from '../../components/app'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import FormField from '../../components/auth/FormField'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import { Button } from '../../components/design-system'
import { getActiveOrganization, getHasPermission } from '../../store/slices/appContext'
import {
  attestSupplierProfile,
  initializeSupplierProfile,
  loadCurrentSupplierProfile,
  loadSupplierVocabularies,
  submitSupplierProfile,
  supplierProfileSelectors,
  updateCurrentSupplierProfile,
} from '../../store/slices/entities/supplierProfiles'
import { getSupplierOnboardingStep, supplierOnboardingStepChanged } from '../../store/slices/ui'

const emptyForm = {
  legal_name: '', display_name: '', website: '', business_description: '',
  shared_contact: { name: '', title: '', email: '', phone: '' },
  process_keys: [], material_keys: [], engineering_capability_keys: [], quality_capability_keys: [],
}

const sections = [
  { key: 'company', label: 'Company' },
  { key: 'contact', label: 'Contact' },
  { key: 'capabilities', label: 'Capabilities' },
  { key: 'review', label: 'Review & submit' },
]

const Company = () => {
  const dispatch = useDispatch()
  const organization = useSelector(getActiveOrganization)
  const allowed = useSelector(getHasPermission('supplier_profile.read'))
  const canManage = useSelector(getHasPermission('supplier_profile.manage'))
  const profile = useSelector(supplierProfileSelectors.getCurrent)
  const progress = useSelector(supplierProfileSelectors.getProgress)
  const vocabularies = useSelector(supplierProfileSelectors.getVocabularies)
  const loading = useSelector(supplierProfileSelectors.getLoading)
  const error = useSelector(supplierProfileSelectors.getError)
  const activeStep = useSelector(getSupplierOnboardingStep)
  const [form, setForm] = useState(emptyForm)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    if (!allowed || organization?.type !== 'supplier') return
    dispatch(loadSupplierVocabularies())
    dispatch(canManage ? initializeSupplierProfile() : loadCurrentSupplierProfile())
  }, [allowed, canManage, dispatch, organization?.id, organization?.type])

  useEffect(() => {
    if (!profile) return
    setForm({
      legal_name: profile.legal_name || '',
      display_name: profile.display_name || '',
      website: profile.website || '',
      business_description: profile.business_description || '',
      shared_contact: { ...emptyForm.shared_contact, ...(profile.shared_contact || {}) },
      process_keys: profile.process_keys || [],
      material_keys: profile.material_keys || [],
      engineering_capability_keys: profile.engineering_capability_keys || [],
      quality_capability_keys: profile.quality_capability_keys || [],
    })
  }, [profile])

  const stepIndex = useMemo(() => sections.findIndex(item => item.key === activeStep), [activeStep])
  if (!allowed || organization?.type !== 'supplier') return <PermissionDenied />
  if (loading && !profile) return <section className='appPanel'><AppSkeleton lines={8} /></section>

  const change = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const changeContact = (key, value) => setForm(current => ({ ...current, shared_contact: { ...current.shared_contact, [key]: value } }))
  const selectStepForCompletion = key => {
    const mapping = { company_basics: 'company', primary_contact: 'contact', capabilities: 'capabilities', facilities: 'review', machines: 'review', attestation: 'review' }
    dispatch(supplierOnboardingStepChanged(mapping[key] || 'review'))
  }

  const save = async event => {
    event?.preventDefault()
    if (!profile || !canManage) return
    setPending(true)
    setFeedback(null)
    const result = await dispatch(updateCurrentSupplierProfile({ ...form, last_completed_section: activeStep, version: profile.version }))
    setPending(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: resultError(result, 'We could not save this section.') })
    setFeedback({ type: 'success', message: 'Changes saved.' })
  }

  const attest = async () => {
    setPending(true)
    setFeedback(null)
    const result = await dispatch(attestSupplierProfile(profile.version))
    setPending(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: resultError(result, 'We could not record your attestation.') })
    setFeedback({ type: 'success', message: 'Accuracy attestation recorded.' })
  }

  const submit = async () => {
    setPending(true)
    setFeedback(null)
    const result = await dispatch(submitSupplierProfile(profile.version))
    setPending(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: resultError(result, 'Complete every required item before submitting.') })
    setFeedback({ type: 'success', message: 'Your profile was submitted to Velakron for review.' })
  }

  return <>
    <Seo title='Supplier onboarding' description='Company profile and supplier onboarding.' path='/app/company' noIndex />
    <AppPageHeader eyebrow='Supplier workspace' title='Company onboarding' description='Build the verified company profile that connected customers will use to understand your manufacturing capabilities.' />
    {error && <ErrorState description={error.message} onRetry={() => dispatch(loadCurrentSupplierProfile())} />}
    {profile && <SupplierStateNotice profile={profile} />}
    <div className='onboardingLayout'>
      <OnboardingProgress profile={profile} progress={progress} onSelect={selectStepForCompletion} />
      <section className='appPanel onboardingWorkspace'>
        <nav className='onboardingSteps' aria-label='Onboarding sections'>{sections.map((section, index) => <button key={section.key} type='button' className={section.key === activeStep ? 'is-active' : ''} onClick={() => dispatch(supplierOnboardingStepChanged(section.key))}><span>{index + 1}</span>{section.label}</button>)}</nav>
        <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
        {activeStep === 'company' && <form className='supplierForm' onSubmit={save}>
          <header><Building2 aria-hidden='true' /><div><h2>Company basics</h2><p>Required company names and a brief public description.</p></div></header>
          <div className='authForm__row'><FormField id='legal-name' label='Legal company name' value={form.legal_name} onChange={event => change('legal_name', event.target.value)} required disabled={!canManage} /><FormField id='display-name' label='Customer-facing name' value={form.display_name} onChange={event => change('display_name', event.target.value)} required disabled={!canManage} /></div>
          <FormField id='company-website' label='Website' type='url' placeholder='https://example.com' value={form.website} onChange={event => change('website', event.target.value)} disabled={!canManage} />
          <label className='textAreaField' htmlFor='business-description'><span>Business description</span><textarea id='business-description' value={form.business_description} onChange={event => change('business_description', event.target.value)} maxLength={3000} required disabled={!canManage} /><small>Describe what your company makes and what customers should know about your operation.</small></label>
          {canManage && <Button type='submit' disabled={pending}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <Save aria-hidden='true' />} Save company basics</Button>}
        </form>}
        {activeStep === 'contact' && <form className='supplierForm' onSubmit={save}>
          <header><Building2 aria-hidden='true' /><div><h2>Shared primary contact</h2><p>This contact can be seen by connected OEM customers.</p></div></header>
          <div className='authForm__row'><FormField id='contact-name' label='Full name' value={form.shared_contact.name} onChange={event => changeContact('name', event.target.value)} required disabled={!canManage} /><FormField id='contact-title' label='Job title' value={form.shared_contact.title} onChange={event => changeContact('title', event.target.value)} disabled={!canManage} /></div>
          <div className='authForm__row'><FormField id='contact-email' label='Email' type='email' value={form.shared_contact.email} onChange={event => changeContact('email', event.target.value)} required disabled={!canManage} /><FormField id='contact-phone' label='Phone' type='tel' value={form.shared_contact.phone} onChange={event => changeContact('phone', event.target.value)} disabled={!canManage} /></div>
          {canManage && <Button type='submit' disabled={pending}><Save aria-hidden='true' /> Save primary contact</Button>}
        </form>}
        {activeStep === 'capabilities' && <form className='supplierForm' onSubmit={save}>
          <header><Building2 aria-hidden='true' /><div><h2>Company capabilities</h2><p>Select the capabilities customers can rely on across your operation.</p></div></header>
          <ChoiceGrid legend='Manufacturing processes' options={vocabularies.processes} values={form.process_keys} onChange={value => change('process_keys', value)} disabled={!canManage} />
          <ChoiceGrid legend='Materials' options={vocabularies.materials} values={form.material_keys} onChange={value => change('material_keys', value)} disabled={!canManage} />
          <ChoiceGrid legend='Engineering support' options={vocabularies.engineering_capabilities} values={form.engineering_capability_keys} onChange={value => change('engineering_capability_keys', value)} disabled={!canManage} />
          <ChoiceGrid legend='Quality capabilities' options={vocabularies.quality_capabilities} values={form.quality_capability_keys} onChange={value => change('quality_capability_keys', value)} disabled={!canManage} />
          {canManage && <Button type='submit' disabled={pending}><Save aria-hidden='true' /> Save capabilities</Button>}
        </form>}
        {activeStep === 'review' && <div className='supplierForm reviewChecklist'>
          <header><CheckCircle2 aria-hidden='true' /><div><h2>Review and submit</h2><p>Every required item must be complete before Velakron can review your supplier account.</p></div></header>
          <div className='reviewCards'>
            <Button href='/app/facilities' variant={profile?.section_completion?.facilities ? 'secondary' : 'primary'}>Manage facilities <ArrowRight aria-hidden='true' /></Button>
            <Button href='/app/machines' variant={profile?.section_completion?.machines ? 'secondary' : 'primary'}>Manage machines <ArrowRight aria-hidden='true' /></Button>
            <Button href='/app/certifications' variant='secondary'>Optional certifications <ArrowRight aria-hidden='true' /></Button>
          </div>
          <label className='attestationBox'><input type='checkbox' checked={Boolean(profile?.attested_at)} onChange={() => !profile?.attested_at && attest()} disabled={!canManage || pending || Boolean(profile?.attested_at)} /><span><strong>I confirm this profile is accurate</strong><small>I am authorized to provide this company, facility, and machine information to Velakron and connected customers.</small></span></label>
          {canManage && <Button onClick={submit} disabled={pending || !progress?.ready || profile?.onboarding_state === 'ready_for_review'}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <Send aria-hidden='true' />} {profile?.onboarding_state === 'ready_for_review' ? 'Submitted for review' : 'Submit to Velakron'}</Button>}
          {!progress?.ready && <p className='formHint'>Complete the remaining items shown in the progress panel before submitting.</p>}
        </div>}
        <footer className='onboardingFooter'><Button variant='secondary' disabled={stepIndex <= 0} onClick={() => dispatch(supplierOnboardingStepChanged(sections[Math.max(0, stepIndex - 1)].key))}>Back</Button><Button variant='secondary' disabled={stepIndex >= sections.length - 1} onClick={() => dispatch(supplierOnboardingStepChanged(sections[Math.min(sections.length - 1, stepIndex + 1)].key))}>Next</Button></footer>
      </section>
    </div>
  </>
}

Company.getLayout = PortalPageLayout
export default Company
