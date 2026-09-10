import { ListChecks } from 'lucide-react'
import Seo from '../../components/marketing/MarketingSeo'
import { withMarketing } from '../../components/marketing/MarketingLayout'
import { CtaLink, TextLink } from '../../components/marketing/Elements'
function ThankYou() {
  return <><Seo title='Early Access next steps' path='/early-access/thank-you' description='What happens after an Early Access application.' noIndex /><section className='mk-section'><div className='mk-container mk-narrow mk-thank-you'><ListChecks size={42} aria-hidden /><p className='mk-eyebrow'>Early Access · next steps</p><h1>What happens after you apply.</h1><p className='mk-lead'>After the application form confirms receipt, our team reviews the workflow, participating organizations, and data requirements before discussing an Early Access offer.</p><p>Applying does not accept your company into the cohort, create an account, or start a subscription. We will follow up using the contact details you supplied. There is no need to send technical files.</p><div className='mk-actions'><CtaLink href='/how-it-works'>Explore the workflow</CtaLink><TextLink href='/insights'>Read the production guides</TextLink></div><p className='mk-workflow-note'>Haven’t applied yet? <TextLink href='/early-access'>Start an application</TextLink></p></div></section></>
}
export default withMarketing(ThankYou)
