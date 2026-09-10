import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useDispatch } from 'react-redux'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { submitDemoRequest } from '../../store/demoRequests'
import { apiCallBegan } from '../../store/api'
import contract from '../../content/marketing/applicationContract.json'
import { validateInquiry } from '../../content/marketing/inquiryValidation'

export const inquiryLabels = { full_name: 'Full name', email: 'Work email', company_name: 'Company name', applicant_type: 'We participate as', country_region: 'Country / region', intended_data_category: 'Data your workflow would require', message: 'Your coordination problem', consent: 'Contact permission', data_restrictions_acknowledged: 'Data restrictions' }
const initial = { full_name:'',email:'',company_name:'',message:'',applicant_type:'',country_region:'',intended_data_category:'',consent:false,data_restrictions_acknowledged:false,website:'',request_id:'' }
export default function PublicInquiryForm({ earlyAccess = false }) {
  const dispatch = useDispatch(), router = useRouter(), summary = useRef(null), receipt = useRef(null)
  const [form,setForm] = useState(initial), [errors,setErrors] = useState({}), [pending,setPending] = useState(false), [success,setSuccess] = useState(null), [ready,setReady] = useState(false), [restored,setRestored] = useState(false), [storageAvailable,setStorageAvailable] = useState(false)
  const key = earlyAccess ? 'velakron:early-access-draft:v2' : 'velakron:demo-draft:v2'
  const prefix = earlyAccess ? 'ea' : 'demo'
  const hasAnswers = value => ['full_name','email','company_name','message','country_region','intended_data_category'].some(name => Boolean(value?.[name]?.trim()))
  useEffect(() => {
    let saved = null
    try {
      const value = JSON.parse(sessionStorage.getItem(key) || 'null')
      if (value?.expires > Date.now() && value?.form) saved = Object.fromEntries(Object.keys(initial).filter(name => typeof value.form[name] === 'string').map(name => [name,value.form[name].slice(0,2000)]))
      else sessionStorage.removeItem(key)
      sessionStorage.setItem(`${key}:check`,'1'); sessionStorage.removeItem(`${key}:check`); setStorageAvailable(true)
    } catch { /* Private browsing can disable draft recovery; submission still works. */ }
    setForm({ ...initial, ...(saved || {}), request_id: saved?.request_id || crypto.randomUUID(), consent: false, data_restrictions_acknowledged: false, website: '' })
    setRestored(hasAnswers(saved)); setReady(true)
  },[key])
  useEffect(() => {
    if (earlyAccess && router.isReady && router.query.type === 'supplier') setForm(current => ({ ...current,applicant_type: current.applicant_type || 'supplier' }))
  },[earlyAccess,router.isReady,router.query.type,ready])
  useEffect(() => {
    if (!ready || success) return
    if (!hasAnswers(form)) { try { sessionStorage.removeItem(key) } catch {} return }
    try { sessionStorage.setItem(key,JSON.stringify({ expires: Date.now() + 86400000, form: { ...form,consent:false,data_restrictions_acknowledged:false,website:'' } })) } catch { setStorageAvailable(false) }
  },[form,key,ready,success])
  useEffect(() => { if (success) receipt.current?.focus() },[success])
  const update = event => { const {name,type,checked,value} = event.target; setForm(current => ({ ...current,[name]:type==='checkbox' ? checked : value })); setErrors(current => ({ ...current,[name]:undefined,form:undefined })) }
  const clearDraft = () => { setForm({ ...initial,request_id:crypto.randomUUID() });setErrors({});setRestored(false);try {sessionStorage.removeItem(key)} catch {} }
  const submit = async event => {
    event.preventDefault()
    if (pending) return
    const next = validateInquiry(form,earlyAccess)
    if (Object.keys(next).length) { setErrors(next);requestAnimationFrame(() => summary.current?.focus());return }
    setPending(true);setErrors({})
    const data = earlyAccess ? form : Object.fromEntries(['full_name','email','company_name','message','consent','website'].map(name => [name,form[name]]))
    try {
      const result = await dispatch(earlyAccess ? apiCallBegan({url:'/early-access-applications',method:'post',data,requestKey:'public-early-access'}) : submitDemoRequest(data))
      if (!result?.ok) { setErrors({ ...(result?.error?.details || {}),form: 'We could not confirm receipt. Your answers are still here. Please retry or email info@velakron.com.' });requestAnimationFrame(() => summary.current?.focus());return }
      setSuccess(result.payload?.data || {received:true})
      try { sessionStorage.removeItem(key) } catch {}
    } catch { setErrors({form:'We could not connect. Your answers are still here; please try again.'});requestAnimationFrame(() => summary.current?.focus()) }
    finally { setPending(false) }
  }
  const field = (name,{type='text',maxLength=160,autoComplete,wide=false}={}) => <label className={`mk-field${wide ? ' mk-field--full' : ''}`} htmlFor={`${prefix}-${name}`} key={name}><span id={`${prefix}-${name}-label`}>{name==='message' && !earlyAccess ? 'What would you like to see?' : inquiryLabels[name]}</span>{contract.enums[name] ? <select id={`${prefix}-${name}`} name={name} aria-labelledby={`${prefix}-${name}-label`} value={form[name]} onChange={update} required aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${prefix}-error-${name}` : undefined}><option value=''>Select an option</option>{contract.enums[name].map(option => <option key={option} value={option}>{({oem:'OEM',supplier:'Supplier',both:'Both OEM and supplier'})[option] || option}</option>)}</select> : type==='textarea' ? <textarea id={`${prefix}-${name}`} name={name} aria-labelledby={`${prefix}-${name}-label`} value={form[name]} onChange={update} required maxLength={2000} rows={4} aria-invalid={Boolean(errors[name])} aria-describedby={`${prefix}-message-hint${errors[name] ? ` ${prefix}-error-${name}` : ''}`} /> : <input id={`${prefix}-${name}`} name={name} type={type} aria-labelledby={`${prefix}-${name}-label`} value={form[name]} onChange={update} required maxLength={maxLength} autoComplete={autoComplete} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${prefix}-error-${name}` : undefined} />}{type==='textarea' && <small className='mk-field__hint' id={`${prefix}-message-hint`}>A general workflow description is enough. Do not include technical files, customer details, or controlled data.</small>}{errors[name] && <small className='mk-field__error' id={`${prefix}-error-${name}`}>{errors[name]}</small>}</label>
  const consent = (name,text,href,label) => <div key={name}><label htmlFor={`${prefix}-${name}`}><input id={`${prefix}-${name}`} name={name} type='checkbox' checked={form[name]} onChange={update} required aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${prefix}-error-${name}` : undefined} /><span>{text} <Link href={href} target='_blank' rel='noopener'>{label} (new tab)</Link>.</span></label>{errors[name] && <p className='mk-field__error' id={`${prefix}-error-${name}`}>{errors[name]}</p>}</div>
  if (success) return <section className='mk-application' id='application' aria-labelledby={`${prefix}-receipt`}><CheckCircle2 size={32} aria-hidden /><p className='mk-eyebrow'>Received by Velakron</p><h2 id={`${prefix}-receipt`} tabIndex={-1} ref={receipt}>{earlyAccess ? 'Your application is with our team.' : 'Your demo request is with our team.'}</h2><p>We’ll use your contact details to {earlyAccess ? 'discuss your workflow, data requirements, and fit for Early Access' : 'arrange a time and focus for your demo'}.</p>{earlyAccess && <p>Applying does not create an account, start billing, or confirm enrollment.</p>}{success.reference_id && <p className='mk-receipt-reference'>Receipt: {success.reference_id}</p>}<Link className='mk-text-link' href={earlyAccess ? '/early-access/thank-you' : '/how-it-works'}>{earlyAccess ? 'Read the next steps' : 'Explore the workflow'}<ArrowRight size={16} aria-hidden /></Link></section>
  return <form id='application' className='mk-application' onSubmit={submit} noValidate aria-labelledby={`${prefix}-title`} aria-busy={pending}>
    <p className='mk-eyebrow'>{earlyAccess ? 'Apply for Early Access' : 'Request a demo'}</p><h2 id={`${prefix}-title`}>{earlyAccess ? 'Tell us about your workflow.' : 'Tell us what you want to explore.'}</h2><p>All fields are required. We’ll confirm receipt on this page.</p>
    {restored && <p className='mk-notice' role='status'>Your draft was restored. Please review your answers and confirm the permissions again.</p>}
    {Object.values(errors).some(Boolean) && <div className='mk-form-error' role='alert' ref={summary} tabIndex={-1}><strong>{errors.form || 'Please review these fields.'}</strong><ul>{Object.entries(errors).filter(([name,value]) => name!=='form' && value && inquiryLabels[name]).map(([name,value]) => <li key={name}><a href={`#${prefix}-${name}`} onClick={event => {event.preventDefault();document.getElementById(`${prefix}-${name}`)?.focus()}}>{inquiryLabels[name]}: {value}</a></li>)}</ul></div>}
    <fieldset disabled={pending}><legend className='mk-sr-only'>Contact and workflow details</legend><div className='mk-field-grid'>
      {field('full_name',{autoComplete:'name'})}{field('email',{type:'email',maxLength:320,autoComplete:'email'})}{field('company_name',{maxLength:180,autoComplete:'organization',wide:!earlyAccess})}
      {earlyAccess && <>{field('applicant_type')}{field('country_region')}{field('intended_data_category')}</>}{field('message',{type:'textarea',wide:true})}
    </div><div className='mk-honeypot' aria-hidden='true'><label>Leave this field empty<input name='website' value={form.website} onChange={update} tabIndex={-1} autoComplete='off' /></label></div>
    <div className='mk-consents'>{earlyAccess && consent('data_restrictions_acknowledged',contract.restrictionText,'/acceptable-use','Data restrictions')}{consent('consent',`Velakron may contact me about this ${earlyAccess ? 'application' : 'demo request'}.`,'/privacy','Privacy Notice')}</div>
    <div className='mk-form-actions'><button className='mk-button' type='submit' disabled={!ready || pending}>{pending ? 'Sending…' : earlyAccess ? 'Submit application' : 'Request my demo'}<ArrowRight size={17} aria-hidden /></button><button className='mk-text-button' type='button' onClick={clearDraft}>Clear answers</button></div></fieldset>
    <p className='mk-form-footnote'>{storageAvailable ? 'Drafts recover after a refresh in this tab for up to 24 hours. Use Clear answers on a shared device.' : 'Draft recovery is unavailable in this browser. Keep this tab open until you submit.'} No files, payment, or account creation.</p>
  </form>
}
