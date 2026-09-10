import Seo from '../components/marketing/MarketingSeo'
import { withMarketing } from '../components/marketing/MarketingLayout'
import { CtaLink, TextLink } from '../components/marketing/Elements'

const NotFound = () => <section className='mk-section mk-grid-bg'>
  <Seo title='Page not found' description='The requested Velakron page could not be found.' path='/404' noIndex />
  <div className='mk-container mk-thank-you'>
    <p className='mk-eyebrow'>404 · Page not found</p>
    <h1>Let’s get you back to the work.</h1>
    <p className='mk-lead'>This address does not lead to a page. Explore the shared production workflow or contact the team for help.</p>
    <div className='mk-actions'><CtaLink href='/'>Return home</CtaLink><TextLink href='/how-it-works'>How Velakron works</TextLink><TextLink href='/contact'>Contact us</TextLink></div>
  </div>
</section>

export default withMarketing(NotFound)
