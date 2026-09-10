import Seo from '../components/marketing/MarketingSeo'
import { supportingPages } from '../content/marketing/supportingPages'
import { withMarketing } from '../components/marketing/MarketingLayout'
import { PageHero, FeatureStory, FaqList, TextLink, FinalCta, CtaLink } from '../components/marketing/Elements'
import ProductFigure from '../components/marketing/ProductFigure'

const InformationPage = ({ page, slug }) => <>
  <Seo title={page.eyebrow} description={page.description} path={`/${slug}`} />
  <PageHero eyebrow={page.eyebrow} title={page.title} action={!page.legal && !page.kind}>{page.description}</PageHero>
  {page.kind === 'contact' && <section className='mk-section mk-tint'><div className='mk-container mk-contact-options'><article><h2>Explore Early Access</h2><p>Bring a production workflow to the partner program.</p><CtaLink /></article><article><h2>See the product</h2><p>Arrange a focused conversation around your team’s needs.</p><CtaLink href='/request-demo' secondary>Request a demo</CtaLink></article><article><h2>Ask a question</h2><p>For company, supplier, data, or other inquiries.</p><a className='mk-text-link' href='mailto:info@velakron.com'>info@velakron.com</a></article></div></section>}
  {slug === 'quality' ? page.sections.map((section,index)=><FeatureStory key={section.title} number={`0${index+1}`} eyebrow={section.eyebrow} title={section.title} reverse={index%2===0} media={<ProductFigure name={section.media} />}>{section.paragraphs.map(text=><p key={text}>{text}</p>)}</FeatureStory>) : page.sections && <section className='mk-section'><div className='mk-container mk-editorial'>{page.sections.map(section=><section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map(text=><p key={text}>{text}</p>)}{section.link && <TextLink href={section.link[1]}>{section.link[0]}</TextLink>}</section>)}{page.legal && <p className='mk-policy-date'>Version: September 10, 2026 · Velakron LLC</p>}</div></section>}
  {page.faqs && <section className='mk-section'><div className='mk-container mk-narrow'><FaqList items={page.faqs} /></div></section>}
  {!page.legal && <FinalCta />}
</>

export const getStaticPaths = () => ({
  paths: Object.keys(supportingPages).map(slug => ({ params: { slug } })),
  fallback: false,
})

export const getStaticProps = ({ params }) => ({
  props: {
    page: supportingPages[params.slug],
    slug: params.slug,
  },
})

export default withMarketing(InformationPage)
