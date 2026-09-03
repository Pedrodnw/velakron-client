import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  LoaderCircle,
  LockKeyhole,
  Sparkles,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { MarketingFooter, MarketingHeader } from '../components/home/VisibilityLandingPage'
import Seo from '../components/Seo'
import {
  bookVisibilityDemo,
  captureVisibilityContact,
  createAssessmentVisit,
  loadVisibilityAvailability,
  loadVisibilityResult,
  markVisibilityDemoClicked,
  saveVisibilityAnswers,
  startVisibilityAssessment,
} from '../store/visibilityAssessment'

export const visibilityQuestions = [
  { key: 'supplier_count', label: 'How many outside suppliers are you actively managing?', note: 'Count the suppliers your team relies on for active production.', options: [['1_10', '1–10'], ['11_50', '11–50'], ['51_200', '51–200'], ['200_plus', '200+']] },
  { key: 'status_method', label: 'How do you currently know where outsourced parts are in production?', note: 'Choose the method your team depends on most often.', options: [['integrated_system', 'Integrated system'], ['supplier_portals', 'Supplier portals'], ['spreadsheets', 'Spreadsheets'], ['email_calls', 'Email & calls'], ['usually_ask', 'Usually have to ask']] },
  { key: 'chasing_frequency', label: 'How often does your team contact suppliers just to get status?', options: [['rarely', 'Rarely'], ['monthly', 'Monthly'], ['weekly', 'Weekly'], ['daily', 'Daily']] },
  { key: 'delay_awareness', label: 'When a supplier part is going to be late, how early do you usually know?', options: [['early_enough', 'Early enough to respond'], ['few_days', 'A few days before'], ['already_late', 'Already late'], ['often_surprised', 'Often surprised']] },
  { key: 'operational_impact', label: 'What is most affected by late or unclear supplier status?', note: 'Choose the closest answer, even if more than one area is affected.', options: [['production', 'Production'], ['customer_delivery', 'Customer delivery'], ['purchasing_workload', 'Purchasing workload'], ['engineering_programs', 'Engineering or programs'], ['multiple_areas', 'Multiple areas']] },
  { key: 'role', label: 'What best describes your role?', options: [['supply_chain', 'Supply Chain'], ['purchasing', 'Purchasing'], ['operations', 'Operations'], ['manufacturing', 'Manufacturing'], ['engineering', 'Engineering'], ['program_management', 'Program Management'], ['executive', 'Executive'], ['other', 'Other']] },
  { key: 'company_size', label: 'Company size?', options: [['under_50', '<50'], ['50_249', '50–249'], ['250_999', '250–999'], ['1000_5000', '1,000–5,000'], ['5000_plus', '5,000+']] },
  { key: 'buying_timeline', label: 'How soon are you interested in improving supplier visibility?', options: [['exploring', 'Exploring'], ['this_year', 'This year'], ['3_6_months', '3–6 months'], ['actively_looking', 'Actively looking']] },
]

const initialContact = { first_name: '', last_name: '', company_name: '', email: '', job_title: '', phone: '', consent: false, website: '' }
const storageKey = 'velakron_visibility_assessment'
const errorMessage = result => result?.error?.message || result?.error?.code || 'Something went wrong. Please try again.'

const readSession = () => {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(window.sessionStorage.getItem(storageKey)) } catch (_error) { return null }
}

const writeSession = value => {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(storageKey, JSON.stringify(value))
}

const clearSession = () => {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(storageKey)
}

const formatSlotDay = value => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York' }).format(new Date(value))
const formatSlotTime = value => new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' }).format(new Date(value))
const formatBooking = value => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York', timeZoneName: 'short' }).format(new Date(value))

const Progress = ({ current, total }) => <div className='assessmentProgress' aria-label={`Question ${current} of ${total}`}>
  <div><span>Production Visibility Assessment</span><strong>{current} of {total}</strong></div>
  <span className='assessmentProgress__track'><i style={{ width: `${(current / total) * 100}%` }} /></span>
</div>

const AssessmentQuestion = ({ question, answer, number, onBack, onContinue, onSelect, pending }) => <section className='assessmentCard assessmentQuestion' aria-labelledby='assessment-question'>
  <Progress current={number} total={visibilityQuestions.length} />
  <div className='assessmentQuestion__heading'>
    <span className='assessmentQuestion__number'>0{number}</span>
    <div>
      <h1 id='assessment-question'>{question.label}</h1>
      {question.note && <p>{question.note}</p>}
    </div>
  </div>
  <div className={`assessmentOptions ${question.options.length > 5 ? 'assessmentOptions--compact' : ''}`} role='radiogroup' aria-labelledby='assessment-question'>
    {question.options.map(([value, label]) => <button
      type='button'
      role='radio'
      aria-checked={answer === value}
      className={answer === value ? 'isSelected' : ''}
      onClick={() => onSelect(value)}
      key={value}
    >
      <span>{answer === value ? <Check aria-hidden='true' /> : null}</span>
      <strong>{label}</strong>
    </button>)}
  </div>
  <footer className='assessmentCard__footer'>
    <button type='button' className='assessmentBack' onClick={onBack}><ArrowLeft aria-hidden='true' /> Back</button>
    <button type='button' className='assessmentPrimary' disabled={!answer || pending} onClick={onContinue}>{pending ? <><LoaderCircle className='assessmentSpinner' /> Saving…</> : <>{number === visibilityQuestions.length ? 'Continue to results' : 'Next question'} <ArrowRight aria-hidden='true' /></>}</button>
  </footer>
</section>

const ContactStep = ({ contact, error, pending, onBack, onChange, onSubmit }) => <section className='assessmentCard assessmentContact'>
  <Progress current={visibilityQuestions.length} total={visibilityQuestions.length} />
  <div className='assessmentContact__heading'>
    <span><LockKeyhole aria-hidden='true' /></span>
    <div><p className='visibilityHome__eyebrow'>Your results are ready</p><h1>See your Production Visibility Score</h1><p>Enter your work details to see your score immediately. We’ll also use them to tailor your demo if you choose to book one.</p></div>
  </div>
  {error && <div className='assessmentError' role='alert'>{error}</div>}
  <form className='assessmentContact__form' id='assessment-contact-form' onSubmit={onSubmit}>
    <label><span>First name</span><input name='first_name' required autoComplete='given-name' value={contact.first_name} onChange={onChange} /></label>
    <label><span>Last name</span><input name='last_name' required autoComplete='family-name' value={contact.last_name} onChange={onChange} /></label>
    <label><span>Company</span><input name='company_name' required autoComplete='organization' value={contact.company_name} onChange={onChange} /></label>
    <label><span>Work email</span><input name='email' type='email' required autoComplete='email' value={contact.email} onChange={onChange} /></label>
    <label><span>Job title <em>Optional</em></span><input name='job_title' autoComplete='organization-title' value={contact.job_title} onChange={onChange} /></label>
    <label><span>Phone <em>Optional</em></span><input name='phone' type='tel' autoComplete='tel' value={contact.phone} onChange={onChange} /></label>
    <label className='assessmentHoneypot' aria-hidden='true'>Website<input name='website' value={contact.website} onChange={onChange} tabIndex='-1' autoComplete='off' /></label>
    <label className='assessmentConsent'>
      <input name='consent' type='checkbox' checked={contact.consent} onChange={onChange} />
      <span><Check aria-hidden='true' /></span>
      <p>Velakron may contact me about this assessment and a personalized product demonstration.</p>
    </label>
  </form>
  <footer className='assessmentCard__footer'>
    <button type='button' className='assessmentBack' onClick={onBack}><ArrowLeft aria-hidden='true' /> Back</button>
    <button type='submit' form='assessment-contact-form' className='assessmentPrimary' disabled={pending}>{pending ? <><LoaderCircle className='assessmentSpinner' /> Calculating…</> : <>See my visibility score <ArrowRight /></>}</button>
  </footer>
</section>

const BookingPanel = ({ availability, bookingError, bookingPending, onBook, selectedSlot, setSelectedSlot }) => {
  const grouped = useMemo(() => availability.reduce((groups, slot) => {
    const label = formatSlotDay(slot.starts_at)
    groups[label] ||= []
    groups[label].push(slot)
    return groups
  }, {}), [availability])
  return <section className='assessmentBooking' id='assessment-booking' aria-labelledby='booking-title'>
    <div className='assessmentBooking__heading'><span><CalendarDays /></span><div><p className='visibilityHome__eyebrow'>Choose a time</p><h2 id='booking-title'>Book your 20-minute demo</h2><p>No second form. Select an available time below.</p></div></div>
    {bookingError && <div className='assessmentError' role='alert'>{bookingError}</div>}
    {bookingPending && !availability.length ? <div className='assessmentBooking__loading'><LoaderCircle className='assessmentSpinner' /> Checking availability…</div> : <div className='assessmentBooking__days'>
      {Object.entries(grouped).map(([day, slots]) => <div key={day}><strong>{day}</strong><div>{slots.map(slot => <button type='button' className={selectedSlot === slot.starts_at ? 'isSelected' : ''} onClick={() => setSelectedSlot(slot.starts_at)} key={slot.starts_at}>{formatSlotTime(slot.starts_at)}</button>)}</div></div>)}
    </div>}
    {!bookingPending && !availability.length && !bookingError && <p className='assessmentBooking__empty'>No times are currently available. Our team already has your details and will contact you to schedule.</p>}
    <button className='assessmentPrimary assessmentBooking__confirm' type='button' disabled={!selectedSlot || bookingPending} onClick={onBook}>{bookingPending && availability.length ? <><LoaderCircle className='assessmentSpinner' /> Booking…</> : <>Confirm this time <ArrowRight /></>}</button>
    <small>Times shown in Eastern Time. You’ll receive a confirmation by email.</small>
  </section>
}

const ResultsStep = ({ result, availability, bookingError, bookingOpen, bookingPending, onBook, onOpenBooking, selectedSlot, setSelectedSlot }) => {
  const score = result.production_visibility_score
  if (result.booking_status === 'booked') return <section className='assessmentCard assessmentResult assessmentResult--booked'>
    <span className='assessmentResult__success'><CheckCircle2 /></span>
    <p className='visibilityHome__eyebrow'>Assessment complete · Demo booked</p>
    <h1>You’re all set.</h1>
    <p>Your Velakron demo is scheduled for <strong>{formatBooking(result.booking.starts_at)}</strong>. We’ll tailor the conversation to your assessment.</p>
    <div className='assessmentResult__bookedCard'><CalendarDays /><span><small>20-minute Production Visibility Demo</small><strong>{formatBooking(result.booking.starts_at)}</strong></span></div>
  </section>
  return <section className='assessmentCard assessmentResult'>
    <div className='assessmentResult__header'>
      <div className='assessmentScore' style={{ '--assessment-score': `${score * 3.6}deg` }}><span><strong>{score}</strong><small>out of 100</small></span></div>
      <div><p className='visibilityHome__eyebrow'>Your Production Visibility Score</p><h1>{result.visibility_category_label}</h1><p>{result.explanation}</p></div>
    </div>
    <div className='assessmentResult__signals'>
      <article><span><Eye /></span><div><strong>A clear baseline</strong><p>Your score reflects how status is collected, how often it must be chased, and when risk becomes visible.</p></div></article>
      <article><span><BarChart3 /></span><div><strong>A practical next step</strong><p>Compare this baseline with a shared, live view of supplier production and part status.</p></div></article>
      <article><span><Sparkles /></span><div><strong>A tailored conversation</strong><p>Your assessment answers are already attached to your Velakron demo request.</p></div></article>
    </div>
    <div className='assessmentResult__cta'>
      <div><p className='visibilityHome__eyebrow'>See what this would look like with your suppliers</p><h2>Turn status chasing into direct production visibility.</h2><p>See how Velakron can give your team direct visibility into supplier production and part status.</p></div>
      <button type='button' className='assessmentPrimary' onClick={onOpenBooking}>Book a 20-Minute Demo <ArrowRight /></button>
    </div>
    {bookingOpen && <BookingPanel {...{ availability, bookingError, bookingPending, onBook, selectedSlot, setSelectedSlot }} />}
  </section>
}

const VisibilityAssessment = () => {
  const dispatch = useDispatch()
  const initialized = useRef(false)
  const [credentials, setCredentials] = useState(null)
  const [phase, setPhase] = useState('intro')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [contact, setContact] = useState(initialContact)
  const [result, setResult] = useState(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [bookingOpen, setBookingOpen] = useState(false)
  const [availability, setAvailability] = useState([])
  const [selectedSlot, setSelectedSlot] = useState('')
  const [bookingPending, setBookingPending] = useState(false)
  const [bookingError, setBookingError] = useState('')

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const createVisit = () => dispatch(createAssessmentVisit()).then(response => {
      if (!response?.ok) return setError(errorMessage(response))
      const value = response.payload.data
      setCredentials(value)
      writeSession(value)
    })
    const existing = readSession()
    if (existing?.assessment_id && existing?.access_token) {
      setCredentials(existing)
      setAnswers(existing.answers || {})
      if (existing.captured) {
        setPending(true)
        dispatch(loadVisibilityResult(existing.assessment_id, existing.access_token)).then(response => {
          setPending(false)
          if (!response?.ok) {
            clearSession()
            setCredentials(null)
            setAnswers({})
            return createVisit()
          }
          setResult(response.payload.data.result)
          setPhase('result')
        })
      } else if (Object.keys(existing.answers || {}).length === visibilityQuestions.length) {
        setPhase('contact')
      }
      return
    }
    createVisit()
  }, [dispatch])

  const begin = async () => {
    if (!credentials) return
    setPending(true); setError('')
    let currentCredentials = credentials
    let response = await dispatch(startVisibilityAssessment(currentCredentials.assessment_id, currentCredentials.access_token))
    if (!response?.ok && response?.error?.code === 'ASSESSMENT_NOT_FOUND') {
      const created = await dispatch(createAssessmentVisit())
      if (!created?.ok) {
        setPending(false)
        return setError(errorMessage(created))
      }
      currentCredentials = created.payload.data
      setCredentials(currentCredentials)
      setAnswers({})
      writeSession(currentCredentials)
      response = await dispatch(startVisibilityAssessment(currentCredentials.assessment_id, currentCredentials.access_token))
    }
    setPending(false)
    if (!response?.ok) return setError(errorMessage(response))
    setPhase('question')
  }

  const continueQuestion = async () => {
    if (questionIndex < visibilityQuestions.length - 1) return setQuestionIndex(value => value + 1)
    setPending(true); setError('')
    const response = await dispatch(saveVisibilityAnswers(credentials.assessment_id, credentials.access_token, answers))
    setPending(false)
    if (!response?.ok) return setError(errorMessage(response))
    writeSession({ ...credentials, answers })
    setPhase('contact')
  }

  const updateContact = event => {
    const { checked, name, type, value } = event.target
    setContact(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  const submitContact = async event => {
    event.preventDefault(); setPending(true); setError('')
    const response = await dispatch(captureVisibilityContact(credentials.assessment_id, credentials.access_token, contact))
    setPending(false)
    if (!response?.ok) return setError(errorMessage(response))
    setResult(response.payload.data.result)
    writeSession({ ...credentials, answers, captured: true })
    setPhase('result')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openBooking = useCallback(async () => {
    setBookingOpen(true); setBookingPending(true); setBookingError('')
    await dispatch(markVisibilityDemoClicked(credentials.assessment_id, credentials.access_token))
    const response = await dispatch(loadVisibilityAvailability(credentials.assessment_id, credentials.access_token))
    setBookingPending(false)
    if (!response?.ok) return setBookingError(errorMessage(response))
    setAvailability(response.payload.data.slots || [])
    setTimeout(() => document.getElementById('assessment-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }, [credentials, dispatch])

  const book = async () => {
    setBookingPending(true); setBookingError('')
    const response = await dispatch(bookVisibilityDemo(credentials.assessment_id, credentials.access_token, selectedSlot))
    setBookingPending(false)
    if (!response?.ok) {
      setBookingError(errorMessage(response))
      const refreshed = await dispatch(loadVisibilityAvailability(credentials.assessment_id, credentials.access_token))
      if (refreshed?.ok) setAvailability(refreshed.payload.data.slots || [])
      return
    }
    setResult(response.payload.data.result)
    writeSession({ ...credentials, answers, captured: true, booked: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const back = () => {
    setError('')
    if (phase === 'contact') return setPhase('question')
    if (questionIndex === 0) return setPhase('intro')
    setQuestionIndex(value => value - 1)
  }

  const question = visibilityQuestions[questionIndex]
  return <div className='visibilityHome assessmentPage'>
    <Seo title='Production Visibility Assessment' description='See how much visibility your team has into supplier production in about two minutes.' path='/visibility-assessment' />
    <a className='skipLink' href='#main-content'>Skip to main content</a>
    <MarketingHeader />
    <main id='main-content' className='assessmentPage__main'>
      <div className='visibilityHome__container assessmentPage__shell'>
        {phase === 'intro' && <section className='assessmentIntro'>
          <div className='assessmentIntro__copy'>
            <p className='visibilityHome__eyebrow'>Two-minute assessment</p>
            <h1>How much visibility do you actually have into your suppliers?</h1>
            <p>Answer eight practical questions and get a clear Production Visibility Score for your current process.</p>
            {error && <div className='assessmentError' role='alert'>{error}</div>}
            <button type='button' className='assessmentPrimary' onClick={begin} disabled={!credentials || pending}>{pending || !credentials ? <><LoaderCircle className='assessmentSpinner' /> Preparing…</> : <>Check Your Visibility <ArrowRight /></>}</button>
            <small><Clock3 /> About 2 minutes · Results shown immediately</small>
          </div>
          <div className='assessmentIntro__preview' aria-hidden='true'>
            <span className='assessmentIntro__icon'><Eye /></span>
            <p>Production Visibility Score</p>
            <div className='assessmentIntro__meter'><i /><i /><i /><i /></div>
            <div className='assessmentIntro__previewRows'><span><CheckCircle2 />Status visibility</span><span><CheckCircle2 />Delay awareness</span><span><CheckCircle2 />Supplier follow-up</span></div>
          </div>
        </section>}
        {phase === 'question' && <AssessmentQuestion question={question} answer={answers[question.key]} number={questionIndex + 1} onBack={back} onSelect={value => setAnswers(current => ({ ...current, [question.key]: value }))} onContinue={continueQuestion} pending={pending} />}
        {phase === 'contact' && <ContactStep {...{ contact, error, pending }} onBack={back} onChange={updateContact} onSubmit={submitContact} />}
        {phase === 'result' && result && <ResultsStep {...{ result, availability, bookingError, bookingOpen, bookingPending, onBook: book, onOpenBooking: openBooking, selectedSlot, setSelectedSlot }} />}
      </div>
    </main>
    <MarketingFooter />
  </div>
}

VisibilityAssessment.getLayout = page => page

export default VisibilityAssessment
