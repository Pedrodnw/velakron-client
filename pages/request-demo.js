import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Mail,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { MarketingFooter, MarketingHeader } from '../components/home/VisibilityLandingPage'
import Seo from '../components/Seo'
import { submitDemoRequest } from '../store/demoRequests'

const initialForm = {
  full_name: '',
  company_name: '',
  email: '',
  job_title: '',
  phone: '',
  message: '',
  consent: false,
  website: '',
}

const requestError = result => (
  result?.error?.message
  || result?.error?.details?.body
  || result?.error?.code
  || 'We could not submit your request. Please try again or email info@velakron.com.'
)

const RequestDemo = () => {
  const dispatch = useDispatch()
  const [form, setForm] = useState(initialForm)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  const update = event => {
    const { checked, name, type, value } = event.target
    setForm(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  const submit = async event => {
    event.preventDefault()
    setPending(true)
    setError('')
    const result = await dispatch(submitDemoRequest(form))
    setPending(false)
    if (!result?.ok) {
      setError(requestError(result))
      return
    }
    setSuccess(result.payload?.data || { received: true })
    setForm(initialForm)
  }

  return <div className='visibilityHome demoRequestPage'>
    <Seo
      title='Request a Demo'
      description='Request a personalized Velakron production-visibility demonstration.'
      path='/request-demo'
    />
    <a className='skipLink' href='#main-content'>Skip to main content</a>
    <MarketingHeader />
    <main id='main-content'>
      <section className='demoRequestHero'>
        <div className='visibilityHome__container demoRequestHero__inner'>
          <div className='demoRequestHero__story'>
            <p className='visibilityHome__eyebrow'>See Velakron in action</p>
            <h1>Get the clarity your production team has been missing.</h1>
            <p className='demoRequestHero__lead'>Tell us what you need to see. We’ll prepare a focused conversation around your suppliers, production workflow, and the decisions your team needs to make faster.</p>
            <div className='demoRequestHero__points'>
              <article><span><UsersRound /></span><div><strong>A conversation built around your operation</strong><p>We’ll focus on the programs, suppliers, and visibility gaps that matter to you.</p></div></article>
              <article><span><Clock3 /></span><div><strong>A prompt human response</strong><p>A Velakron team member will follow up, typically within one business day.</p></div></article>
              <article><span><ShieldCheck /></span><div><strong>No sensitive data required</strong><p>You do not need to share drawings, part files, or confidential program details.</p></div></article>
            </div>
            <div className='demoRequestHero__contact'><Mail /><span><small>Prefer email?</small><a href='mailto:info@velakron.com'>info@velakron.com</a></span></div>
          </div>

          <section className='demoRequestCard' aria-labelledby='demo-request-title'>
            {success ? <div className='demoRequestSuccess' role='status'>
              <span><CheckCircle2 aria-hidden='true' /></span>
              <p className='visibilityHome__eyebrow'>Request received</p>
              <h2 id='demo-request-title'>Thank you. We’ll be in touch.</h2>
              <p>Your request is now with the Velakron team. We’ll review what you shared and contact you to arrange the right demo.</p>
              {success.reference_id && <small>Reference: {success.reference_id}</small>}
              <button type='button' onClick={() => setSuccess(null)}>Submit another request</button>
            </div> : <>
              <div className='demoRequestCard__heading'>
                <p className='visibilityHome__eyebrow'>Request a personalized demo</p>
                <h2 id='demo-request-title'>Tell us about yourself.</h2>
                <p>All fields marked required help us prepare for the conversation.</p>
              </div>

              <form className='demoRequestForm' onSubmit={submit}>
                {error && <div className='demoRequestForm__error' role='alert'>{error}</div>}
                <div className='demoRequestForm__grid'>
                  <label><span>Full name <em>Required</em></span><input name='full_name' value={form.full_name} onChange={update} autoComplete='name' maxLength={160} required placeholder='Your full name' /></label>
                  <label><span>Work email <em>Required</em></span><input name='email' type='email' value={form.email} onChange={update} autoComplete='email' maxLength={320} required placeholder='you@company.com' /></label>
                  <label><span>Company <em>Required</em></span><input name='company_name' value={form.company_name} onChange={update} autoComplete='organization' maxLength={180} required placeholder='Company name' /></label>
                  <label><span>Job title</span><input name='job_title' value={form.job_title} onChange={update} autoComplete='organization-title' maxLength={160} placeholder='Your role' /></label>
                  <label className='demoRequestForm__wide'><span>Phone number</span><input name='phone' type='tel' value={form.phone} onChange={update} autoComplete='tel' maxLength={40} placeholder='Optional' /></label>
                  <label className='demoRequestForm__wide'><span>What would you like to see? <em>Required</em></span><textarea name='message' value={form.message} onChange={update} maxLength={2000} minLength={10} rows={5} required placeholder='Tell us about the production visibility, supplier collaboration, or workflow challenges you want to explore.' /><small>{form.message.length}/2000</small></label>
                </div>
                <label className='demoRequestForm__consent'>
                  <input name='consent' type='checkbox' checked={form.consent} onChange={update} required />
                  <span><Check aria-hidden='true' /></span>
                  <p>I agree that Velakron may use this information to contact me about my demo request. <em>Required</em></p>
                </label>
                <label className='demoRequestForm__honeypot' aria-hidden='true'>Website<input name='website' value={form.website} onChange={update} tabIndex='-1' autoComplete='off' /></label>
                <button className='demoRequestForm__submit' type='submit' disabled={pending}>
                  {pending ? <><LoaderCircle className='spin' aria-hidden='true' /> Sending your request…</> : <>Request my demo <ArrowRight aria-hidden='true' /></>}
                </button>
                <p className='demoRequestForm__notice'>Please do not include drawings, controlled technical data, or other confidential information in this form.</p>
              </form>
            </>}
          </section>
        </div>
      </section>
    </main>
    <MarketingFooter />
  </div>
}

RequestDemo.getLayout = page => page

export default RequestDemo
