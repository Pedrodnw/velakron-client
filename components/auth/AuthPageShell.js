import { CheckCircle2, LockKeyhole, Network } from 'lucide-react'

const defaultPoints = [
  'One secure account for every Velakron interaction',
  'Protected by encrypted credentials and private sessions',
  'Built to support future customer and supplier workflows',
]

const AuthPageShell = ({ eyebrow, title, description, panelTitle, points = defaultPoints, children }) => (
  <section className='authPage gridBackground'>
    <div className='authPage__grid max'>
      <div className='authPage__context'>
        <div>
          <p className='technicalLabel'>{eyebrow}</p>
          <h1>{title}</h1>
          <p className='authPage__description'>{description}</p>
        </div>

        <div className='authPage__assurance'>
          <div className='authPage__assuranceIcon'><Network aria-hidden='true' /></div>
          <div>
            <span>Connected accountability</span>
            <p>Your account is the foundation for clear, traceable collaboration.</p>
          </div>
        </div>
      </div>

      <div className='authPage__panel'>
        <div className='authPage__panelHeading'>
          <span><LockKeyhole aria-hidden='true' /></span>
          <div>
            <p className='technicalLabel'>Secure access</p>
            <h2>{panelTitle}</h2>
          </div>
        </div>

        {children}

        <ul className='authPage__points' aria-label='Account benefits'>
          {points.map(point => <li key={point}>
            <CheckCircle2 aria-hidden='true' />
            <span>{point}</span>
          </li>)}
        </ul>
      </div>
    </div>
  </section>
)

export default AuthPageShell
