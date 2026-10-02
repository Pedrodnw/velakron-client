import Seo from '../components/marketing/MarketingSeo'
import { withMarketing } from '../components/marketing/MarketingLayout'
import { PageHero, Contents, PolicyText, sectionId } from '../components/marketing/Elements'
import agreement from '../content/marketing/subscriptionAgreement.json'

function SubscriptionAgreement() {
  return <>
    <Seo title='Subscription Agreement' description='Terms for Velakron annual subscriptions and ninety-day Early Access pilots.' path='/subscription-agreement' />
    <PageHero compact eyebrow='Account & subscription' title={agreement.title} action={false}>
      <p>The agreement reviewed before starting an annual subscription or Early Access pilot.</p>
      <p className='mk-article-meta'>Version {agreement.version} · Effective {agreement.effective_on}</p>
    </PageHero>
    <section className='mk-section'><div className='mk-container mk-policy-layout'>
      <Contents items={agreement.sections.map(section => ({ id: sectionId(section.title), title: section.title }))} label='In this agreement' />
      <article className='mk-editorial'>
        {agreement.sections.map(section => <section key={section.title} id={sectionId(section.title)}>
          <h2>{section.title}</h2>{section.paragraphs.map(paragraph => <p key={paragraph}><PolicyText text={paragraph} /></p>)}
        </section>)}
        <aside className='mk-notice'><h2>Electronic acceptance</h2><p>{agreement.acceptance_statement}</p><p>Reading this page does not record acceptance. Accept the agreement and your order in Billing before continuing to payment checkout.</p></aside>
        <p><a href='/confidentiality-terms'>Platform Confidentiality Terms</a> · <a href='/acceptable-use'>Acceptable Use</a> · <a href='/privacy'>Privacy Notice</a></p>
        <button className='mk-text-button' type='button' onClick={() => window.print()}>Print / save as PDF</button>
      </article>
    </div></section>
  </>
}

export default withMarketing(SubscriptionAgreement)
