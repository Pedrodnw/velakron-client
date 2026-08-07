import { Button, SectionHeading } from '../design-system'
import { processSteps, statistics } from '../../content/home'

const ProcessSection = () => (
  <section className='processSection'>
    <div className='max'>
      <SectionHeading
        eyebrow='Built Around Ownership'
        title='How We Work'
        description='Most manufacturing companies make parts. Most consultants make recommendations. Velakron takes ownership. We unify engineering, manufacturing, quality, and supplier management into one accountable process.'
      />

      <div className='processSection__steps'>
        {processSteps.map(step => (
          <article className='processCard' key={step.number}>
            <span>{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </article>
        ))}
      </div>

      <p className='processSection__closing'>Throughout the process, your team works with one accountable partner while Velakron manages the technical and operational complexity behind the scenes.</p>
      <Button href='/contact'>Start The Conversation</Button>
    </div>

    <div className='statisticsStrip gridBackground'>
      <div className='max'>
        {statistics.map(stat => (
          <div className='statistic' key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
    </div>
  </section>
)

export default ProcessSection
