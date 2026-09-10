import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { ArrowRight, Mail, Copy } from 'lucide-react'
import contract from '../../content/marketing/applicationContract.json'

const initial = { full_name:'',work_email:'',company_name:'',company_website:'',job_title:'',country_region:'',industry:'',applicant_type:'',supplier_count_band:'',outsourced_parts_band:'',tracking_method:'',production_cycle_band:'',primary_problem:'',supplier_participation:'',oem_partner_status:'',starting_timeframe:'',intended_data_category:'',data_restrictions_acknowledged:false,contact_consent:false,website:'',source:'website' }
export default function EarlyAccessForm() {
  const [form,setForm] = useState(initial), [step,setStep] = useState(1), [errors,setErrors] = useState({}), [draft,setDraft] = useState(null), [copied,setCopied] = useState(false)
  const summary = useRef(null), heading = useRef(null)
  const router = useRouter()
  useEffect(() => {
    if (router.isReady && router.query.type === 'supplier') setForm(current=>({...current,applicant_type:current.applicant_type || 'supplier',source:'supplier_page'}))
    else if (router.isReady && router.query.source === 'visibility_assessment') setForm(current=>({...current,source:'visibility_assessment'}))
  },[router.isReady,router.query.type,router.query.source])
  const update = event => { const {name,type,checked,value} = event.target; setForm(current=>({...current,[name]:type==='checkbox' ? checked : value})); setErrors(current=>({...current,[name]:undefined})) }
  const validate = () => {
    const next = {}
    if (step === 1) {
      if (form.full_name.trim().length < 2) next.full_name = 'Enter your full name.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.work_email.trim())) next.work_email = 'Enter a valid email address.'
      if (form.company_name.trim().length < 2) next.company_name = 'Enter your company name.'
      for (const name of ['country_region','applicant_type']) if (!form[name]) next[name] = 'Choose an option.'
      if (form.company_website) try { const url=new URL(form.company_website); if (!['http:','https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) throw new Error() } catch { next.company_website = 'Enter a full company URL, starting with https://.' }
    } else {
      for (const name of ['tracking_method','intended_data_category']) if (!form[name]) next[name] = 'Choose an option.'
      if (form.primary_problem.trim().length < 20) next.primary_problem = 'Describe the coordination problem in at least 20 characters.'
      if (!form.contact_consent) next.contact_consent = 'Confirm we may respond about your application.'
      if (!form.data_restrictions_acknowledged) next.data_restrictions_acknowledged = 'Confirm you understand the current data restrictions.'
    }
    return next
  }
  const submit = async event => {
    event.preventDefault()
    const next = validate()
    if (Object.keys(next).length) { setErrors(next); requestAnimationFrame(()=>summary.current?.focus()); return }
    if (step === 1) { setStep(2); setErrors({}); requestAnimationFrame(()=>heading.current?.focus()); return }
    const labels = {full_name:'Full name',work_email:'Work email',company_name:'Company',company_website:'Website',job_title:'Role',country_region:'Country / region',industry:'Industry',applicant_type:'Participation',supplier_count_band:'Supplier count',outsourced_parts_band:'Active outsourced parts',tracking_method:'Current tracking',production_cycle_band:'Production cycle',primary_problem:'Coordination problem',supplier_participation:'Supplier participation',oem_partner_status:'OEM partner',starting_timeframe:'Starting timeframe',intended_data_category:'Data category'}
    const answers = Object.entries(labels).filter(([key])=>form[key] && !(form.applicant_type==='supplier' && ['supplier_count_band','outsourced_parts_band','supplier_participation'].includes(key)) && !(form.applicant_type!=='supplier' && key==='oem_partner_status')).map(([key,label])=>`${label}: ${form[key]}`)
    setDraft(['Hello Velakron,','I would like to discuss Early Access.',...answers,contract.restrictionText,contract.consentText].join('\n\n'))
    requestAnimationFrame(()=>heading.current?.focus())
  }

  const field = (name,label,{required=false,type='text',hint='',maxLength=160,autocomplete}={}) => <label className={`mk-field${name==='primary_problem' ? ' mk-field--full' : ''}`} key={name} htmlFor={`ea-${name}`}><span>{label}{!required && <small>Optional</small>}</span>{contract.enums[name] ? <select id={`ea-${name}`} name={name} value={form[name]} onChange={update} required={required} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `ea-error-${name}` : hint ? `ea-hint-${name}` : undefined}><option value=''>Select an option</option>{contract.enums[name].map(value=><option key={value} value={value}>{({oem:'OEM',supplier:'Supplier',both:'Both OEM and supplier'})[value] || value}</option>)}</select> : type === 'textarea' ? <textarea id={`ea-${name}`} name={name} value={form[name]} onChange={update} required={required} rows={4} maxLength={maxLength} aria-invalid={Boolean(errors[name])} aria-describedby={`ea-hint-${name}${errors[name] ? ` ea-error-${name}` : ''}`} /> : <input id={`ea-${name}`} name={name} type={type} value={form[name]} onChange={update} required={required} maxLength={maxLength} autoComplete={autocomplete} aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `ea-error-${name}` : hint ? `ea-hint-${name}` : undefined} />}{hint && <small id={`ea-hint-${name}`} className='mk-field__hint'>{hint}</small>}{errors[name] && <small id={`ea-error-${name}`} className='mk-field__error'>{errors[name]}</small>}</label>
  if (draft) return <section className='mk-application' aria-labelledby='ea-draft-title'><p className='mk-eyebrow'>Review your email</p><h2 id='ea-draft-title' ref={heading} tabIndex={-1}>Your application draft is ready.</h2><p><strong>Nothing has been sent.</strong> Open the draft in your email app and send it to <a href='mailto:info@velakron.com'>info@velakron.com</a>. You can also copy it into your preferred email service.</p><label className='mk-field'><span>Email draft</span><textarea readOnly rows={12} value={draft} /></label><div className='mk-actions'><a className='mk-button' href={`mailto:info@velakron.com?subject=${encodeURIComponent('Velakron Early Access — '+form.company_name)}&body=${encodeURIComponent(draft)}`}><Mail size={17} aria-hidden />Open email draft</a><button className='mk-button mk-button--secondary' type='button' onClick={async()=>{try {await navigator.clipboard.writeText(draft);setCopied(true)} catch {setCopied(false)}}}><Copy size={17} aria-hidden />{copied ? 'Copied' : 'Copy draft'}</button></div><p role='status'>{copied ? 'Draft copied. Paste it into an email to info@velakron.com.' : 'Your answers stay in this page until you send them through your email service.'}</p><button className='mk-button mk-button--secondary' type='button' onClick={()=>{setDraft(null);setCopied(false)}}>Edit answers</button><p className='mk-form-footnote'><Link href='/early-access/thank-you'>What happens after you send your application</Link></p></section>
  return <form className='mk-application' onSubmit={submit} noValidate aria-labelledby='ea-form-title'>
    <div className='mk-form-progress'><span className={step===1 ? 'is-current' : ''}>01 · Your organization</span><span className={step===2 ? 'is-current' : ''}>02 · Your workflow</span></div>
    <h2 id='ea-form-title' ref={heading} tabIndex={-1}>{step===1 ? 'Tell us about your organization.' : 'Where would a shared view help?'}</h2><p>This form prepares an email for you to review and send. Fields marked optional can wait for our conversation.</p>
    {Object.values(errors).some(Boolean) && <div className='mk-form-error' ref={summary} tabIndex={-1} role='alert'><strong>{errors.form || 'Please review these fields.'}</strong><ul>{Object.entries(errors).filter(([key,value])=>key!=='form' && value).map(([key,value])=><li key={key}><a href={`#ea-${key}`}>{key.replaceAll('_',' ')}: {value}</a></li>)}</ul></div>}
    <fieldset><legend className='mk-sr-only'>{step===1 ? 'Your organization' : 'Your workflow'}</legend><div className='mk-field-grid'>{step===1 ? <>
      {field('full_name','Full name',{required:true,autocomplete:'name'})}{field('work_email','Work email',{required:true,type:'email',maxLength:320,autocomplete:'email'})}
      {field('company_name','Company name',{required:true,maxLength:180,autocomplete:'organization'})}{field('job_title','Job title',{autocomplete:'organization-title'})}
      {field('company_website','Company website',{type:'url',maxLength:500,autocomplete:'url'})}{field('country_region','Country / region',{required:true})}
      {field('applicant_type','We participate as',{required:true})}{field('industry','Industry')}
    </> : <>
      {field('tracking_method','How do you track production today?',{required:true})}{field('production_cycle_band','Typical production cycle')}
      {form.applicant_type !== 'supplier' ? <>{field('supplier_count_band','Participating supplier count')}{field('outsourced_parts_band','Active outsourced parts',{hint:'Current production commitments, rather than your entire part catalogue.'})}{field('supplier_participation','Could suppliers participate?')}</> : field('oem_partner_status','Do you have an OEM partner?')}
      {field('starting_timeframe','When would you like to start?')}
      {field('primary_problem','What is the main coordination problem?',{required:true,type:'textarea',maxLength:1200,hint:'For example: repeated update requests, unclear dates, or technical questions across inboxes. Do not include drawings, customer/program details, or controlled data.'})}
      {field('intended_data_category','What category of data would your workflow require?',{required:true})}
    </>}</div>
      <div className='mk-honeypot' aria-hidden='true'><label>Leave this field empty<input name='website' tabIndex={-1} autoComplete='off' value={form.website} onChange={update} /></label></div>
      {step===2 && <div className='mk-consents'>{form.intended_data_category && form.intended_data_category !== 'Ordinary non-controlled data' && <p className='mk-notice'>We can discuss your requirement, but the current environment does not support the controlled categories described below. Submitting this form does not approve data access.</p>}{[['data_restrictions_acknowledged',contract.restrictionText,'/acceptable-use','Read the data restrictions'],['contact_consent',contract.consentText,'/privacy','Read the Privacy Notice']].map(([name,text,href,label])=><div key={name}><label htmlFor={`ea-${name}`}><input type='checkbox' id={`ea-${name}`} name={name} checked={form[name]} onChange={update} required aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `ea-error-${name}` : undefined} /><span>{text} <Link href={href} target='_blank' rel='noopener'>{label} (opens a new tab).</Link></span></label>{errors[name] && <p id={`ea-error-${name}`} className='mk-field__error'>{errors[name]}</p>}</div>)}</div>}
      <div className='mk-form-actions'>{step===2 && <button className='mk-button mk-button--secondary' type='button' onClick={()=>{setStep(1);setErrors({});requestAnimationFrame(()=>heading.current?.focus())}}>Back</button>}<button className='mk-button' type='submit'>{step===1 ? 'Continue' : 'Prepare email application'}<ArrowRight size={17} aria-hidden /></button></div>
    </fieldset><p className='mk-form-footnote'>No files, payment, or account creation. Nothing is submitted from this page.</p>
  </form>
}
