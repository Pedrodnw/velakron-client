import Seo from '../components/marketing/MarketingSeo'
import { withMarketing } from '../components/marketing/MarketingLayout'
import { PageHero, FeatureStory, SectionHeading, CheckList, TextLink, CtaLink, FaqList, FinalCta } from '../components/marketing/Elements'
import ProductFigure from '../components/marketing/ProductFigure'

function ForSuppliers() { return <>
  <Seo title='Customer collaboration for manufacturing suppliers' path='/for-suppliers' description='Give connected OEM customers a useful production update, ask a part question, and keep each customer’s work appropriately scoped.' />
  <PageHero eyebrow='For manufacturing suppliers' title='Give the update once. Keep the customer informed.' action={false} aside={<ProductFigure name='update' placement='hero' priority />}><p>Share a changed stage or expected ship date against a clear production commitment. Your connected customer can read the update and its context in the same place.</p><div className='mk-actions'><CtaLink href='/early-access?type=supplier'>Discuss supplier participation</CtaLink><TextLink href='/login'>Already invited? Log in</TextLink></div></PageHero>
  <FeatureStory number='01' eyebrow='A question with its context' title='Get the clarification the operation needs.' media={<ProductFigure name='conversation' />} reverse><p>Ask about the relevant drawing requirement or model feature. Keep the response beside the applicable revision so the next person can understand what was agreed.</p><TextLink href='/how-it-works'>Follow the complete workflow</TextLink></FeatureStory>
  <section className='mk-section'><div className='mk-container mk-split'><div><SectionHeading eyebrow='At the point of work' title='Use the browser on your phone, too.'>Read the production record and use supported update actions without a separate native app.</SectionHeading><CheckList items={['Confirm the customer, part, and current commitment','Share meaningful changes as they happen','Agree a cadence that avoids duplicate reporting']} /></div><ProductFigure name='mobile' placement='portrait' /></div></section>
  <section className='mk-section mk-tint'><div className='mk-container'><SectionHeading eyebrow='Clear customer boundaries' title='Each customer sees its shared work.' /><div className='mk-summary-grid'>
    <article className='mk-summary-card'><h3>Connected relationships.</h3><p>Work with participating OEMs. Each customer’s access stays scoped to the work shared with its organization.</p></article>
    <article className='mk-summary-card'><h3>Your team’s permissions.</h3><p>People act within their assigned role. Connected customers do not receive access to unrelated conversations.</p></article>
    <article className='mk-summary-card'><h3>A practical starting scope.</h3><p>Choose the relationships and people who will participate, and agree which existing status reports the shared record replaces.</p></article>
  </div><div className='mk-actions'><TextLink href='/security'>Access and data boundaries</TextLink></div></div></section>
  <section className='mk-section'><div className='mk-container mk-narrow'><SectionHeading title='Supplier participation, explained.' /><FaqList items={[
    ['Who pays for supplier access?', 'The standard OEM plans include unlimited supplier users. We confirm the Early Access arrangement and scope with the teams involved before onboarding.', [['Explore Early Access','/early-access?type=supplier']]],
    ['Can we apply before an OEM invites us?', 'Yes. Tell us whether you have an interested OEM or are exploring independently. We can discuss a useful starting relationship.', [['Discuss participation','/early-access?type=supplier']]],
    ['How often do we need to update?', 'Agree a cadence with the OEM, plus updates when a meaningful stage, forecast, or concern changes. Participating teams report progress; it is not obtained directly from machine telemetry.', [['Read the update guide','/insights/reduce-supplier-status-follow-up']]],
  ]} /></div></section>
  <FinalCta title='Make the next customer update simpler.' href='/early-access?type=supplier' action='Discuss supplier participation'>Tell us about your customer-update process and the OEM relationships you would like to include.</FinalCta>
</> }
export default withMarketing(ForSuppliers)
