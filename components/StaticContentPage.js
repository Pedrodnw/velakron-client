import { ArrowRight } from 'lucide-react'
import { Button } from './design-system'
import LinkWrap from './LinkWrap'

const StaticContentPage = ({ page }) => (
  <div className='contentPage gridBackground'>
    <section className='contentPage__hero'>
      <div className='max'>
        <p className='technicalLabel'>{page.eyebrow}</p>
        <h1>{page.title}</h1>
        <p>{page.description}</p>
      </div>
    </section>

    <section className='contentPage__sections'>
      <div className='max'>
        {page.sections.map(section => (
          <article className='contentCard' key={section.title}>
            <h2>{section.title}</h2>
            {section.subtitle && <p className='contentCard__subtitle'>{section.subtitle}</p>}
            {section.text && <p>{section.text}</p>}
            {section.items && <ul>{section.items.map(item => <li key={item}>{item}</li>)}</ul>}
            {section.href && <LinkWrap className='contentCard__link' href={section.href}>Contact Velakron <ArrowRight aria-hidden='true' /></LinkWrap>}
          </article>
        ))}
      </div>
    </section>

    <section className='contentPage__cta'>
      <div className='max'>
        <h2>One Partner. One Process. One Outcome.</h2>
        <p>Bring Velakron your manufacturing challenge and start with one accountable conversation.</p>
        <Button href='/contact' showArrow>Start The Conversation</Button>
      </div>
    </section>
  </div>
)

export default StaticContentPage
