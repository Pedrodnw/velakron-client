import {
  BookOpenCheck,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Factory,
  History,
  Link2,
  MonitorPlay,
  PencilLine,
  Play,
  QrCode,
  Search,
  Share2,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../design-system'

const progressKey = 'velakron:sales-demo-tutorial-progress'

export const salesDemoTutorialSteps = [
  { id: 'choose', label: 'Choose the right demo', time: '1 min' },
  { id: 'launch', label: 'Launch safely', time: '2 min' },
  { id: 'present', label: 'Guide a live conversation', time: '3 min' },
  { id: 'template', label: 'Build a reusable template', time: '5–10 min' },
  { id: 'share', label: 'Create a shared link', time: '2 min' },
  { id: 'monitor', label: 'Monitor a visitor', time: '1 min' },
  { id: 'finish', label: 'Finish and follow up', time: '2 min' },
]

const TutorialScreen = ({ kind }) => {
  const top = <><span /><span /><span /><strong>Founder Sales Demo</strong></>
  if (kind === 'home') return <figure className='salesDemoTutorialScreen' aria-label='Annotated preview of the Sales Demo Home page'>
    <div className='salesDemoTutorialScreen__chrome'>{top}</div>
    <div className='salesDemoTutorialScreen__tabs'><b>Home</b><span>Templates</span><span>Live demos</span><span>Shared links</span><span>History</span><span>Tutorial</span></div>
    <div className='salesDemoTutorialScreen__home'>
      <div><small>WHAT WOULD YOU LIKE TO DO?</small><strong>Prepare the right Velakron story</strong><p>Choose the purpose first.</p><button type='button' tabIndex='-1'>Start a demo</button></div>
      <div><span><Building2 aria-hidden='true' /><b>Practice OEM</b></span><span><Factory aria-hidden='true' /><b>Practice Supplier</b></span><span><PencilLine aria-hidden='true' /><b>Create a template</b></span><span><Share2 aria-hidden='true' /><b>Create a shared link</b></span></div>
    </div>
    <i className='salesDemoTutorialMarker is-one'>1</i><i className='salesDemoTutorialMarker is-two'>2</i><i className='salesDemoTutorialMarker is-three'>3</i>
    <figcaption>Home shows the four safest starting actions. Use <strong>Start a demo</strong> when you are not sure which path to take.</figcaption>
  </figure>

  if (kind === 'launcher') return <figure className='salesDemoTutorialScreen' aria-label='Annotated preview of the guided Start a demo window'>
    <div className='salesDemoTutorialScreen__chrome'>{top}</div>
    <div className='salesDemoTutorialScreen__modal'>
      <header><div><small>START A DEMO</small><strong>What would you like to do?</strong></div><b>Step 1 of 4</b></header>
      <div className='salesDemoTutorialScreen__progress'><span /></div>
      <div className='salesDemoTutorialScreen__purpose'><article><MonitorPlay aria-hidden='true' /><b>Practice privately</b><small>No prospect or CRM activity</small></article><article><Sparkles aria-hidden='true' /><b>Present live</b><small>For a live conversation</small></article><article><Share2 aria-hidden='true' /><b>Share for later</b><small>Reusable link or QR code</small></article></div>
      <footer><span>Back</span><b>Continue</b></footer>
    </div>
    <i className='salesDemoTutorialMarker is-four'>1</i><i className='salesDemoTutorialMarker is-five'>2</i><i className='salesDemoTutorialMarker is-six'>3</i>
    <figcaption>The launcher asks for purpose, story, guest role, and an optional label. It never exposes customer data.</figcaption>
  </figure>

  if (kind === 'presenter') return <figure className='salesDemoTutorialScreen' aria-label='Annotated preview of a live Sales Demo presenter workspace'>
    <div className='salesDemoTutorialScreen__chrome'>{top}</div>
    <div className='salesDemoTutorialScreen__outline'><b>1 Overview</b><span>2 Production</span><span>3 Collaboration</span><span>4 Quality</span></div>
    <div className='salesDemoTutorialScreen__presenter'><section><small>NEXT MOMENT</small><strong>Show the at-risk record</strong><p>Explain what changed and who owns the next action.</p><button type='button' tabIndex='-1'>Open this screen</button></section><section><small>DEMO DATA</small><div><b>VK-5001</b><span>At risk</span></div><div><b>VK-3001</b><span>On schedule</span></div></section><section><small>SAFE EVENTS</small><b>Post production update</b><b>Change expected ship date</b><b>Create attention flag</b></section></div>
    <i className='salesDemoTutorialMarker is-seven'>1</i><i className='salesDemoTutorialMarker is-eight'>2</i><i className='salesDemoTutorialMarker is-nine'>3</i>
    <figcaption>Follow the outline from left to right. Use only the suggested synthetic events needed for the prospect's question.</figcaption>
  </figure>

  if (kind === 'template') return <figure className='salesDemoTutorialScreen' aria-label='Annotated preview of the Sales Demo template builder'>
    <div className='salesDemoTutorialScreen__chrome'>{top}</div>
    <div className='salesDemoTutorialScreen__builder'><aside><b>Essentials</b><span>Demo outline</span><span>Featured story</span><span>Supporting data</span><span>Preview &amp; publish</span></aside><section><header><div><small>EDITABLE DRAFT</small><strong>Late-part risk and recovery</strong></div><em>Draft saved</em></header><div className='salesDemoTutorialScreen__form'><label>Audience<input readOnly value='Supply Chain and Operations' /></label><label>Duration<input readOnly value='15 minutes' /></label><label className='is-wide'>Sales objective<textarea readOnly value='Show early schedule risk and accountable recovery.' /></label></div><footer><span>Preview OEM</span><b>Review &amp; publish</b></footer></section></div>
    <i className='salesDemoTutorialMarker is-ten'>1</i><i className='salesDemoTutorialMarker is-eleven'>2</i><i className='salesDemoTutorialMarker is-twelve'>3</i>
    <figcaption>Edit one section at a time. Preview both roles, resolve every readiness item, then publish for future demos.</figcaption>
  </figure>

  if (kind === 'share') return <figure className='salesDemoTutorialScreen' aria-label='Annotated preview of Shared demo link management'>
    <div className='salesDemoTutorialScreen__chrome'>{top}</div>
    <div className='salesDemoTutorialScreen__share'><div className='salesDemoTutorialScreen__qr'><QrCode aria-hidden='true' /></div><section><header><div><small>ACTIVE</small><strong>Aerospace quality follow-up</strong></div><b>Active</b></header><div className='salesDemoTutorialScreen__stats'><span><strong>12</strong><small>Visits</small></span><span><strong>7</strong><small>Contacts</small></span><span><strong>1</strong><small>Live now</small></span><span><strong>58%</strong><small>Completed</small></span></div><div className='salesDemoTutorialScreen__actions'><span>Preview setup page</span><b>Copy link</b><span>QR PNG</span><span>View activity</span></div></section></div>
    <i className='salesDemoTutorialMarker is-thirteen'>1</i><i className='salesDemoTutorialMarker is-fourteen'>2</i><i className='salesDemoTutorialMarker is-fifteen'>3</i>
    <figcaption>Preview is safe. A real visitor is recorded only after they open the public link and submit the setup form.</figcaption>
  </figure>

  if (kind === 'monitor') return <figure className='salesDemoTutorialScreen' aria-label='Annotated preview of the Live demos monitoring view'>
    <div className='salesDemoTutorialScreen__chrome'>{top}</div>
    <div className='salesDemoTutorialScreen__filters'><span><Search aria-hidden='true' /> Search demos</span><b>Prospect</b><span>OEM + Supplier</span><span>Every template</span></div>
    <div className='salesDemoTutorialScreen__history'><header><span>DEMO</span><span>TEMPLATE AND ROLE</span><span>CURRENT STEP</span><span>LAST ACTIVITY</span></header><div><b>Acme Aerospace</b><span>Core sales demo · OEM · v1</span><em>Recently active</em><small>Overview · Just now</small></div><div><b>Presenter rehearsal</b><span>Quality workflow · Supplier · v2</span><em>Online</em><small>Production detail · 2 min ago</small></div></div>
    <i className='salesDemoTutorialMarker is-sixteen'>1</i><i className='salesDemoTutorialMarker is-seventeen'>2</i><i className='salesDemoTutorialMarker is-eighteen'>3</i>
    <figcaption>Filter by session type, then open a row to review presence, the current story step, activity, and safe synthetic-event controls.</figcaption>
  </figure>

  return <figure className='salesDemoTutorialScreen' aria-label='Annotated preview of Sales Demo history and follow-up'>
    <div className='salesDemoTutorialScreen__chrome'>{top}</div>
    <div className='salesDemoTutorialScreen__filters'><span><Search aria-hidden='true' /> Search demos</span><b>Prospect</b><span>All outcomes</span><span>Every template</span></div>
    <div className='salesDemoTutorialScreen__history'><header><span>DEMO</span><span>TEMPLATE AND ROLE</span><span>OUTCOME</span><span>LAST ACTIVITY</span></header><div><b>Acme Aerospace</b><span>Risk recovery · OEM · v1</span><em>Ended early · Follow Up</em><small>Today, 11:42 AM</small></div><div><b>Northstar Systems</b><span>Quality workflow · Supplier · v2</span><em>Expired · Not recorded</em><small>Yesterday, 3:18 PM</small></div></div>
    <i className='salesDemoTutorialMarker is-sixteen'>1</i><i className='salesDemoTutorialMarker is-seventeen'>2</i><i className='salesDemoTutorialMarker is-eighteen'>3</i>
    <figcaption>History keeps prospect sessions separate from practice. Open a row to review events, outcome, and follow-up context.</figcaption>
  </figure>
}

const TutorialStep = ({ id, number, title, eyebrow, children, visual, completed, onToggle, action }) => <article id={`tutorial-${id}`} className={`salesDemoTutorialStep${completed ? ' is-complete' : ''}`}>
  <header>
    <span>{completed ? <Check aria-hidden='true' /> : number}</span>
    <div><p className='technicalLabel'>{eyebrow}</p><h2>{title}</h2></div>
    <label><input type='checkbox' checked={completed} onChange={() => onToggle(id)} /><span>{completed ? 'Completed' : 'Mark complete'}</span></label>
  </header>
  <div className='salesDemoTutorialStep__body'><div className='salesDemoTutorialStep__instructions'>{children}{action}</div>{visual}</div>
</article>

const SalesDemoTutorial = ({ onNavigate, onStart }) => {
  const [completed, setCompleted] = useState([])
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(progressKey) || '[]')
      if (Array.isArray(saved)) setCompleted(saved.filter(id => salesDemoTutorialSteps.some(step => step.id === id)))
    } catch (_) {}
  }, [])
  const percent = Math.round((completed.length / salesDemoTutorialSteps.length) * 100)
  const toggle = id => setCompleted(current => {
    const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id]
    window.localStorage.setItem(progressKey, JSON.stringify(next))
    return next
  })
  const complete = id => completed.includes(id)
  const nextStep = useMemo(() => salesDemoTutorialSteps.find(step => !completed.includes(step.id)), [completed])
  const jump = id => document.getElementById(`tutorial-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return <div className='salesDemoTutorial'>
    <section className='salesDemoTutorialHero'>
      <div><p className='technicalLabel'>Step-by-step tutorial</p><h2>Learn the Sales Demo workspace</h2><p>Prepare a reusable story, practice safely, guide a live prospect, and follow up—without changing real customer data.</p><div><Button onClick={() => nextStep ? jump(nextStep.id) : jump('choose')}><Play aria-hidden='true' /> {completed.length ? 'Continue tutorial' : 'Start the tutorial'}</Button><Button variant='secondary' onClick={onStart}><MonitorPlay aria-hidden='true' /> Open guided launcher</Button></div></div>
      <aside><BookOpenCheck aria-hidden='true' /><strong>{completed.length} of {salesDemoTutorialSteps.length} steps complete</strong><div aria-label={`${percent}% complete`}><span style={{ width: `${percent}%` }} /></div><small>{percent === 100 ? 'You are ready to run a Sales Demo.' : 'About 10 minutes for the core walkthrough.'}</small></aside>
    </section>

    <section className='salesDemoTutorialPaths' aria-label='Choose a tutorial path'>
      <header><p className='technicalLabel'>Choose your goal</p><h2>What are you trying to do?</h2></header>
      <div>
        <button type='button' onClick={() => jump('launch')}><MonitorPlay aria-hidden='true' /><strong>Run my first demo</strong><span>Practice or present live</span></button>
        <button type='button' onClick={() => jump('template')}><PencilLine aria-hidden='true' /><strong>Create a reusable story</strong><span>Build and publish a template</span></button>
        <button type='button' onClick={() => jump('share')}><Link2 aria-hidden='true' /><strong>Send a demo link</strong><span>Self-guided prospect access</span></button>
        <button type='button' onClick={() => jump('finish')}><History aria-hidden='true' /><strong>Review a past demo</strong><span>Outcome and follow-up</span></button>
      </div>
    </section>

    <section className='salesDemoTutorialQuickPath'>
      <div><p className='technicalLabel'>The shortest path</p><h2>Your first safe rehearsal</h2><p>If you do only one thing, run this five-click practice before your next call.</p></div>
      <ol><li><span>1</span><strong>Home</strong></li><li><span>2</span><strong>Start a demo</strong></li><li><span>3</span><strong>Practice privately</strong></li><li><span>4</span><strong>Choose OEM or Supplier</strong></li><li><span>5</span><strong>Launch in new tab</strong></li></ol>
      <Button variant='secondary' onClick={onStart}>Try it now</Button>
    </section>

    <div className='salesDemoTutorialLayout'>
      <aside className='salesDemoTutorialContents'><p className='technicalLabel'>On this page</p>{salesDemoTutorialSteps.map((step, index) => <button type='button' className={complete(step.id) ? 'is-complete' : ''} onClick={() => jump(step.id)} key={step.id}><span>{complete(step.id) ? <Check aria-hidden='true' /> : index + 1}</span><b>{step.label}</b><small>{step.time}</small></button>)}</aside>
      <main className='salesDemoTutorialSteps'>
        <TutorialStep id='choose' number='1' title='Choose the right kind of demo' eyebrow='Start on Home' completed={complete('choose')} onToggle={toggle} visual={<TutorialScreen kind='home' />} action={<Button variant='secondary' onClick={() => onNavigate('overview')}>Open Home</Button>}>
          <ol><li>Open <strong>Home</strong> in the Sales Demo navigation.</li><li>Select <strong>Start a demo</strong> if you want Velakron to guide the decision.</li><li>Choose <strong>Practice privately</strong> for rehearsal, <strong>Present live</strong> for a call, or <strong>Share for later</strong> for a reusable URL.</li></ol>
          <aside className='is-tip'><Sparkles aria-hidden='true' /><div><strong>Recommended for new users</strong><p>Practice privately first. Practice does not create a prospect or CRM activity.</p></div></aside>
        </TutorialStep>

        <TutorialStep id='launch' number='2' title='Launch an isolated demo safely' eyebrow='The four-step launcher' completed={complete('launch')} onToggle={toggle} visual={<TutorialScreen kind='launcher' />} action={<Button variant='secondary' onClick={onStart}>Open Start a demo</Button>}>
          <ol><li>Choose the <strong>purpose</strong>: practice, presenter-led, or shared.</li><li>Choose a published <strong>template</strong> that matches the prospect's problem and available time.</li><li>Choose the <strong>OEM</strong> or <strong>Supplier</strong> guest role.</li><li>For practice or presenter-led demos, add an optional label, prospect name, and company so the session is easy to recognize later.</li><li>Review the summary, then select <strong>Launch in new tab</strong>. For a shared demo, select <strong>Continue to link setup</strong> instead.</li></ol>
          <aside className='is-safe'><CheckCircle2 aria-hidden='true' /><div><strong>Safe by design</strong><p>Every demo receives isolated synthetic organizations, parts, production records, and conversations.</p></div></aside>
        </TutorialStep>

        <TutorialStep id='present' number='3' title='Guide the live conversation' eyebrow='Presenter-led demos' completed={complete('present')} onToggle={toggle} visual={<TutorialScreen kind='presenter' />} action={<Button variant='secondary' onClick={() => onNavigate('sessions')}>Open Live demos</Button>}>
          <ol><li>Keep the founder workspace open and place the guest workspace in the tab or screen you are sharing.</li><li>Open <strong>Live demos</strong>, choose <strong>Presenter-led</strong> in the Type filter, then open the session.</li><li>Follow the numbered story outline. Use <strong>Open this screen</strong> to open the current guest screen in a new tab.</li><li>Read <strong>What to emphasize</strong> and <strong>Guest should notice</strong> before introducing a synthetic event.</li><li>Use only the event that supports the conversation. Confirm the visible result in the guest workspace before moving on.</li></ol>
          <aside className='is-tip'><UsersRound aria-hidden='true' /><div><strong>Tell a story, not a feature inventory</strong><p>Start with the prospect's pain, show one accountable workflow, then pause for questions.</p></div></aside>
        </TutorialStep>

        <TutorialStep id='template' number='4' title='Create and save a reusable starting point' eyebrow='Templates' completed={complete('template')} onToggle={toggle} visual={<TutorialScreen kind='template' />} action={<Button variant='secondary' onClick={() => onNavigate('templates')}>Open Templates</Button>}>
          <ol><li>Open <strong>Templates</strong> and select <strong>Create template</strong>.</li><li>Start from a recommended sales scenario, duplicate a proven template, or choose Advanced custom.</li><li>Name the template for the <strong>buyer problem</strong>, not the company. This keeps it reusable.</li><li>Work through <strong>Essentials → Demo outline → Featured story → Supporting data → Preview &amp; publish</strong>. Draft changes save automatically without affecting live demos or shared links.</li><li>On <strong>Preview &amp; publish</strong>, resolve every readiness item and preview both OEM and Supplier roles.</li><li>Add a clear publication note, then select <strong>Publish for future demos</strong>.</li></ol>
          <aside className='is-warning'><Clock3 aria-hidden='true' /><div><strong>Published versions are permanent</strong><p>Editing creates a new draft. Active sessions keep the version they started with.</p></div></aside>
        </TutorialStep>

        <TutorialStep id='share' number='5' title='Create a self-guided link or QR code' eyebrow='Shared links' completed={complete('share')} onToggle={toggle} visual={<TutorialScreen kind='share' />} action={<Button variant='secondary' onClick={() => onNavigate('campaigns')}>Open Shared links</Button>}>
          <ol><li>Open <strong>Shared links</strong> and select <strong>Create shared link</strong>.</li><li>Choose the published template and either fix the guest role or let visitors choose.</li><li>Give the link a recognizable internal name. Velakron proposes the public address automatically.</li><li>Choose whether the link follows future published versions or stays pinned to the current version.</li><li>Review and publish. Use <strong>Preview setup page</strong> to test without creating a prospect.</li><li>Copy the URL or download the QR image. Pause new visits when the outreach is finished.</li></ol>
          <aside className='is-safe'><QrCode aria-hidden='true' /><div><strong>Preview and real visits are different</strong><p>Preview is non-counting. Contact and session records begin only after a visitor submits the public setup form.</p></div></aside>
        </TutorialStep>

        <TutorialStep id='monitor' number='6' title='See when a prospect is exploring' eyebrow='Live demos' completed={complete('monitor')} onToggle={toggle} visual={<TutorialScreen kind='monitor' />} action={<Button variant='secondary' onClick={() => onNavigate('sessions')}>Monitor Live demos</Button>}>
          <ol><li>Open <strong>Live demos</strong>. Use the Type filter to switch between Prospect, Presenter-led, and Practice sessions.</li><li>Use the presence badge to distinguish online, recently active, idle, and offline visitors.</li><li>Open a prospect session to review its current journey step, recent activity, template version, and safe synthetic-event controls while the visitor explores.</li><li>Only presenter-led sessions offer <strong>Open this screen</strong>. Prospect sessions can still receive safe synthetic events from the founder workspace, but the visitor controls their own navigation.</li></ol>
          <aside className='is-tip'><MonitorPlay aria-hidden='true' /><div><strong>Do not reset a live prospect unexpectedly</strong><p>Reset removes synthetic changes from that demo. End retains the activity history but removes guest access.</p></div></aside>
        </TutorialStep>

        <TutorialStep id='finish' number='7' title='Finish the demo and prepare follow-up' eyebrow='History' completed={complete('finish')} onToggle={toggle} visual={<TutorialScreen kind='history' />} action={<Button variant='secondary' onClick={() => onNavigate('history')}>Open History</Button>}>
          <ol><li>When the conversation is finished, open the session and record the outcome, notes, and optional follow-up date, then select <strong>Save follow-up</strong>.</li><li>Select <strong>End</strong>, then confirm with <strong>End demo</strong>, to remove guest access while retaining the audit history.</li><li>Open <strong>History</strong> and filter by demo type, session status, role, template, shared link, presenter, or date.</li><li>Open the session row to review what the prospect explored and which synthetic events were demonstrated.</li><li>For prospect sessions, saved follow-up is also added to CRM automatically. Presenter-led and practice notes remain in demo History only.</li></ol>
          <aside className='is-safe'><History aria-hidden='true' /><div><strong>Close the loop</strong><p>A useful follow-up mentions the prospect's problem, the workflow they saw, and the agreed next action.</p></div></aside>
        </TutorialStep>
      </main>
    </div>

    <section className='salesDemoTutorialGlossary'>
      <header><p className='technicalLabel'>Quick reference</p><h2>Terms you will see</h2></header>
      <dl><div><dt>Template</dt><dd>A reusable synthetic story and presenter outline.</dd></div><div><dt>Practice</dt><dd>A private rehearsal that does not create a prospect or CRM activity.</dd></div><div><dt>Presenter-led</dt><dd>An isolated workspace controlled during a live conversation.</dd></div><div><dt>Shared link</dt><dd>A reusable URL or QR code for self-guided exploration.</dd></div><div><dt>Published version</dt><dd>The permanent template version used for new demos.</dd></div><div><dt>Reset</dt><dd>Returns one demo's synthetic data to its starting point.</dd></div></dl>
    </section>
  </div>
}

export default SalesDemoTutorial
