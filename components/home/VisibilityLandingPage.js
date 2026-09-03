import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Check,
  CircleCheck,
  Clock,
  Eye,
  Factory,
  Menu,
  Package,
  ShieldCheck,
  Workflow,
  X,
} from 'lucide-react'
import { useState } from 'react'
import LinkWrap from '../LinkWrap'
import { VelakronLogo } from '../design-system'

const features = [
  {
    icon: Eye,
    title: 'Real-time visibility',
    description: 'See the true status of every part across every supplier.',
  },
  {
    icon: Workflow,
    title: 'Streamlined workflow',
    description: 'Eliminate status chasing and manual updates.',
  },
  {
    icon: ShieldCheck,
    title: 'Built for OEM control',
    description: 'You stay in control with secure, role-based access.',
  },
  {
    icon: BarChart3,
    title: 'Data that drives action',
    description: 'Make smarter decisions with real-time insights.',
  },
]

const footerColumns = [
  {
    title: 'Product',
    links: [
      ['Overview', '/#product'],
      ['How it works', '/#how-it-works'],
      ['Security', '/#security'],
      ['Integrations', '/#product'],
    ],
  },
  {
    title: 'Solutions',
    links: [
      ['For OEMs', '/#solutions'],
      ['For suppliers', '/#solutions'],
      ['Production teams', '/#solutions'],
      ['Quality teams', '/#solutions'],
    ],
  },
  {
    title: 'Resources',
    links: [
      ['Resources', '/#resources'],
      ['Help center', '/#resources'],
      ['Contact', '/contact'],
      ['Book a demo', '/request-demo'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About', '/#company'],
      ['Careers', '/#company'],
      ['Contact', '/contact'],
      ['Log in', '/login'],
    ],
  },
]

const ButtonLink = ({ children, href, secondary = false, className = '' }) => (
  <LinkWrap
    className={`visibilityHome__button ${secondary ? 'visibilityHome__button--secondary' : ''} ${className}`.trim()}
    href={href}
  >
    <span>{children}</span>
    <ArrowRight aria-hidden='true' />
  </LinkWrap>
)

export const MarketingHeader = () => {
  const [open, setOpen] = useState(false)

  return <header className={`visibilityHomeHeader ${open ? 'isOpen' : ''}`}>
    <div className='visibilityHome__container visibilityHomeHeader__inner'>
      <LinkWrap className='visibilityHomeHeader__brand' href='/' aria-label='Velakron home'>
        <VelakronLogo priority sizes='156px' />
      </LinkWrap>

      <div className='visibilityHomeHeader__actions'>
        <LinkWrap className='visibilityHomeHeader__login' href='/login'>Log in</LinkWrap>
        <ButtonLink href='/request-demo'>Book a Demo</ButtonLink>
      </div>

      <button
        className='visibilityHomeHeader__menu'
        type='button'
        aria-expanded={open}
        aria-controls='visibility-home-mobile-navigation'
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        onClick={() => setOpen(value => !value)}
      >
        {open ? <X aria-hidden='true' /> : <Menu aria-hidden='true' />}
      </button>
    </div>

    <nav id='visibility-home-mobile-navigation' className='visibilityHomeHeader__mobileNav' aria-label='Mobile navigation'>
      <LinkWrap href='/login' onClick={() => setOpen(false)}>Log in</LinkWrap>
      <ButtonLink href='/request-demo' className='visibilityHomeHeader__mobileCta'>Book a Demo</ButtonLink>
    </nav>
  </header>
}

const DashboardPreview = () => {
  const rows = [
    { part: 'AST-FCA-042', supplier: 'Precision Forge', stage: 'In production', risk: 'At risk', tone: 'risk' },
    { part: 'AST-CPV-017', supplier: 'Cascade Machining', stage: 'Inspection', risk: 'On schedule', tone: 'good' },
    { part: 'AST-RBT-225', supplier: 'Northline Systems', stage: 'Programming', risk: 'On schedule', tone: 'good' },
  ]

  return <div className='visibilityDashboard' aria-label='Velakron production dashboard preview'>
    <aside className='visibilityDashboard__sidebar' aria-hidden='true'>
      <VelakronLogo sizes='92px' />
      <div className='visibilityDashboard__workspace'>
        <Factory />
        <span><small>Organization</small>Asterion Aero</span>
      </div>
      <nav>
        <span className='active'><BarChart3 /> Overview</span>
        <span><Package /> Production</span>
        <span><Factory /> Suppliers</span>
      </nav>
      <div className='visibilityDashboard__secure'><ShieldCheck /> Secure workspace</div>
    </aside>

    <div className='visibilityDashboard__main'>
      <div className='visibilityDashboard__topbar'>
        <div className='visibilityDashboard__avatar'>EP</div>
        <span><strong>Elena Park</strong><small>OEM Administrator</small></span>
      </div>
      <div className='visibilityDashboard__content'>
        <div className='visibilityDashboard__heading'>
          <div>
            <small>OEM workspace</small>
            <h2>Portfolio visibility</h2>
          </div>
          <span className='visibilityDashboard__live'><i />Live</span>
        </div>

        <div className='visibilityDashboard__notice'>
          <AlertTriangle aria-hidden='true' />
          <span><strong>2 actions need attention</strong><small>Review supplier updates and schedule risks.</small></span>
          <ArrowRight aria-hidden='true' />
        </div>

        <div className='visibilityDashboard__metrics'>
          <article><span>Active parts</span><strong>48</strong><small><i className='good' />42 on schedule</small></article>
          <article><span>Needs attention</span><strong>4</strong><small><i className='warning' />2 high priority</small></article>
          <article><span>Delayed</span><strong>2</strong><small><i className='risk' />Action required</small></article>
        </div>

        <div className='visibilityDashboard__table'>
          <div className='visibilityDashboard__tableTitle'><strong>Active production</strong><span>View all <ArrowRight /></span></div>
          <div className='visibilityDashboard__tableHeader'><span>Part</span><span>Supplier</span><span>Stage</span><span>Status</span></div>
          {rows.map(row => <div className='visibilityDashboard__row' key={row.part}>
            <span><strong>{row.part}</strong><small>VK-2026</small></span>
            <span>{row.supplier}</span>
            <span>{row.stage}</span>
            <span className={`status ${row.tone}`}>{row.risk}</span>
          </div>)}
        </div>
      </div>
    </div>
  </div>
}

const ProductionProgress = () => {
  const stages = [
    ['Material ordered', 'Complete'],
    ['Manufacturing', 'In progress'],
    ['Quality inspection', 'Upcoming'],
    ['Ready to ship', 'Upcoming'],
  ]

  return <div className='visibilityProgress' aria-label='Production progress example'>
    <div className='visibilityProgress__top'>
      <span><small>Production record</small><strong>AST-FCA-042</strong></span>
      <span className='visibilityProgress__status'><i />In production</span>
    </div>
    <div className='visibilityProgress__part'>
      <span className='visibilityProgress__partIcon'><Package /></span>
      <span><small>Precision actuator housing</small><strong>Required arrival: Aug 22, 2026</strong></span>
    </div>
    <div className='visibilityProgress__track'>
      {stages.map(([stage, state], index) => <div className={`visibilityProgress__stage stage${index}`} key={stage}>
        <span>{index < 1 ? <Check /> : index === 1 ? <Clock /> : index + 1}</span>
        <div><strong>{stage}</strong><small>{state}</small></div>
      </div>)}
    </div>
    <div className='visibilityProgress__footer'>
      <span><i className='visibilityProgress__pulse' />Supplier updated 12 minutes ago</span>
      <strong>73% complete</strong>
    </div>
  </div>
}

const MobilePreview = () => (
  <div className='visibilityPhone' aria-label='Velakron mobile production view'>
    <div className='visibilityPhone__speaker' />
    <div className='visibilityPhone__bar'><span>9:41</span><span>● ◒</span></div>
    <div className='visibilityPhone__header'>
      <span className='visibilityPhone__mark'>V</span>
      <strong>Production</strong>
      <span className='visibilityPhone__avatar'>EP</span>
    </div>
    <div className='visibilityPhone__body'>
      <small>Part status</small>
      <h3>AST-FCA-042</h3>
      <p>Precision actuator housing</p>
      <div className='visibilityPhone__pill'><i />In production</div>
      <div className='visibilityPhone__timeline'>
        <span className='done'><Check /></span>
        <div><strong>Material ordered</strong><small>Completed Aug 3</small></div>
        <span className='current'><Clock /></span>
        <div><strong>Manufacturing</strong><small>In progress · 73%</small></div>
        <span>3</span>
        <div><strong>Quality inspection</strong><small>Up next</small></div>
        <span>4</span>
        <div><strong>Ready to ship</strong><small>Expected Aug 19</small></div>
      </div>
      <div className='visibilityPhone__update'><CircleCheck /><span><strong>Latest update</strong><small>Supplier update received 12m ago</small></span></div>
    </div>
  </div>
)

export const MarketingFooter = () => (
  <footer id='company' className='visibilityHomeFooter'>
    <div className='visibilityHome__container visibilityHomeFooter__main'>
      <div className='visibilityHomeFooter__brand'>
        <VelakronLogo sizes='150px' />
        <p>Production visibility that keeps manufacturing moving.</p>
        <span>Every part. Every supplier. One clear view.</span>
      </div>
      {footerColumns.map(column => <nav aria-label={`${column.title} links`} key={column.title}>
        <strong>{column.title}</strong>
        {column.links.map(([label, href]) => <LinkWrap href={href} key={label}>{label}</LinkWrap>)}
      </nav>)}
    </div>
    <div className='visibilityHome__container visibilityHomeFooter__bottom'>
      <span>© 2026 Velakron. All rights reserved.</span>
      <div><LinkWrap href='/terms'>Terms</LinkWrap><LinkWrap href='/privacy'>Privacy</LinkWrap><LinkWrap href='/#security'>Security</LinkWrap></div>
    </div>
  </footer>
)

const VisibilityLandingPage = () => (
  <div className='visibilityHome'>
    <a className='skipLink' href='#main-content'>Skip to main content</a>
    <MarketingHeader />
    <main id='main-content'>
      <section className='visibilityHero'>
        <div className='visibilityHome__container visibilityHero__inner'>
          <div className='visibilityHero__copy'>
            <p className='visibilityHome__eyebrow'>Production visibility. Delivered.</p>
            <h1>Stop asking.<br /> <span>Start knowing.</span></h1>
            <p className='visibilityHero__description'>
              Velakron gives OEMs real-time visibility into every part, every machine, and every supplier—so you can make faster decisions and keep production moving.
            </p>
            <div className='visibilityHero__actions'>
              <ButtonLink href='/request-demo'>Book a Demo</ButtonLink>
              <ButtonLink href='#how-it-works' secondary>See How It Works</ButtonLink>
            </div>
            <div className='visibilityHero__trust'>
              <span><Check />Real-time updates</span>
              <span><Check />Secure by design</span>
              <span><Check />Built for OEMs</span>
            </div>
          </div>
          <div className='visibilityHero__visual'>
            <DashboardPreview />
            <div className='visibilityHero__float visibilityHero__float--top'><span><Eye /></span><div><strong>Full visibility</strong><small>Across your supply chain</small></div></div>
            <div className='visibilityHero__float visibilityHero__float--bottom'><span><CircleCheck /></span><div><strong>42 parts on schedule</strong><small>Updated in real time</small></div></div>
          </div>
        </div>
      </section>

      <section className='visibilityAssessmentPromo' aria-labelledby='visibility-assessment-heading'>
        <div className='visibilityHome__container visibilityAssessmentPromo__panel'>
          <div className='visibilityAssessmentPromo__icon' aria-hidden='true'><Eye /></div>
          <div className='visibilityAssessmentPromo__copy'>
            <p className='visibilityHome__eyebrow'>Production Visibility Assessment</p>
            <h2 id='visibility-assessment-heading'>How much visibility do you actually have into your suppliers?</h2>
            <p>Find out in about 2 minutes.</p>
          </div>
          <ButtonLink href='/visibility-assessment'>Check Your Visibility</ButtonLink>
        </div>
      </section>

      <section id='product' className='visibilityFeatures'>
        <div className='visibilityHome__container'>
          <p className='visibilityHome__eyebrow visibilityHome__eyebrow--center'>Clarity at every step</p>
          <h2>Everything you need to keep<br /> production moving.</h2>
          <div className='visibilityFeatures__grid'>
            {features.map(({ icon: Icon, title, description }, index) => <article id={index === 2 ? 'security' : undefined} key={title}>
              <span><Icon aria-hidden='true' /></span>
              <small>0{index + 1}</small>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>)}
          </div>
        </div>
      </section>

      <section id='how-it-works' className='visibilityWorkflow'>
        <div id='solutions' className='visibilityHome__container visibilityWorkflow__inner'>
          <div className='visibilityWorkflow__visual'>
            <ProductionProgress />
          </div>
          <div className='visibilityWorkflow__copy'>
            <p className='visibilityHome__eyebrow'>One connected workflow</p>
            <h2>Track every step.<br /> From start to ship.</h2>
            <p>Velakron standardizes production tracking so you always know what&apos;s happening, what&apos;s next, and what needs your attention.</p>
            <ul>
              <li><span><Check /></span>Standardized production milestones</li>
              <li><span><Check /></span>Automated alerts for risks and delays</li>
              <li><span><Check /></span>Historical data for every part</li>
            </ul>
            <ButtonLink href='/login' secondary>Explore the Platform</ButtonLink>
          </div>
          <div className='visibilityWorkflow__phone'><MobilePreview /></div>
        </div>
      </section>

      <section id='resources' className='visibilityCta'>
        <div className='visibilityHome__container visibilityCta__panel'>
          <div className='visibilityCta__grid' aria-hidden='true' />
          <div className='visibilityCta__copy'>
            <p className='visibilityHome__eyebrow'>Move with confidence</p>
            <h2>Ready to get visibility<br /> that drives impact?</h2>
            <p>See how Velakron gives your team the clarity to make faster decisions, reduce risk, and keep every program moving forward.</p>
            <div>
              <ButtonLink href='/request-demo'>Book a Demo</ButtonLink>
              <ButtonLink href='/contact' secondary>Talk to Sales</ButtonLink>
            </div>
          </div>
          <div className='visibilityCta__graphic' aria-hidden='true'>
            <span className='ring ring1' /><span className='ring ring2' /><span className='ring ring3' />
            <span className='visibilityCta__center'><Eye /></span>
            <span className='visibilityCta__node node1'><Package /></span>
            <span className='visibilityCta__node node2'><Factory /></span>
            <span className='visibilityCta__node node3'><BarChart3 /></span>
          </div>
        </div>
      </section>
    </main>
    <MarketingFooter />
  </div>
)

export default VisibilityLandingPage
