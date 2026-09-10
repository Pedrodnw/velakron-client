import Seo from '../components/marketing/MarketingSeo'
import { withMarketing } from '../components/marketing/MarketingLayout'
import { PageHero, FeatureStory, SectionHeading, CheckList, TextLink, FaqList, FinalCta } from '../components/marketing/Elements'
import ProductFigure from '../components/marketing/ProductFigure'
import { commonFaqs } from '../content/marketing/site'

function ForOems() { return <>
  <Seo title='Production visibility for OEMs' path='/for-oems' description='See supplier progress, changed dates, and the decisions your team needs to make across outsourced production.' />
  <PageHero eyebrow='For OEMs · companies coordinating outsourced manufacturing' title='Know which order needs your attention.' aside={<ProductFigure name='worklist' placement='hero' priority />}><p>Find changed dates, stale updates, and unanswered questions across connected suppliers. Give purchasing, engineering, and operations the same starting point.</p></PageHero>
  <FeatureStory number='01' eyebrow='Dates you can interpret' title='A required arrival is not a ship forecast.' media={<ProductFigure name='record' />} reverse><p>Keep the date your team needs separate from the date the supplier expects to ship. Read both alongside the current production stage and the latest update.</p><CheckList items={['Part and revision tied to a specific lot','Supplier commitment visible to the team','Update history available when a forecast changes']} /></FeatureStory>
  <FeatureStory number='02' eyebrow='Exceptions with ownership' title='See who needs to act next.' media={<ProductFigure name='issue' />}><p>A stopped operation needs a different response from a routine status update. See the production block, the responsible company, and the decision needed to move forward.</p><TextLink href='/quality'>Explore quality decisions and evidence</TextLink></FeatureStory>
  <section className='mk-section mk-tint'><div className='mk-container'><SectionHeading eyebrow='Make adoption practical' title='Start with a small supplier group.'>Agree what the shared record replaces in your reporting routine.</SectionHeading><div className='mk-summary-grid'>
    <article className='mk-summary-card'><p className='mk-label'>Your team</p><h3>Define the work.</h3><p>Choose suitable orders, confirm the applicable revisions and dates, and name the people who will answer supplier questions.</p></article>
    <article className='mk-summary-card'><p className='mk-label'>Your suppliers</p><h3>Agree the updates.</h3><p>Set a useful cadence and report stage, forecast, or concern changes as they happen.</p></article>
    <article className='mk-summary-card'><p className='mk-label'>Our team</p><h3>Support the cycle.</h3><p>We help onboard the participants, support the workflow, and collect practical feedback within the agreed scope.</p></article>
  </div><p className='mk-scope-note'>Your internal planning system remains in place. Direct ERP synchronization is outside the current Early Access scope.</p><TextLink href='/for-suppliers'>Understand the supplier’s side</TextLink></div></section>
  <section className='mk-section'><div className='mk-container mk-narrow'><SectionHeading title='Before you begin.' /><FaqList items={commonFaqs.filter((_,i)=>[2,3,4].includes(i))} /></div></section>
  <FinalCta title='Bring a workflow your team wants to improve.' />
</> }
export default withMarketing(ForOems)
