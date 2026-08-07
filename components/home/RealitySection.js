import { Check } from 'lucide-react'
import PicCont from '../PicCont'
import { commonChallenges } from '../../content/home'
import { SectionHeading } from '../design-system'

const RealitySection = () => (
  <section className='realitySection gridBackground'>
    <div className='max'>
      <SectionHeading
        eyebrow='The Reality'
        title="Manufacturing Doesn't Need To Be Complicated."
        description='Exceptional manufacturing capability already exists. The challenge is bringing together the right engineering, the right suppliers, and the right processes under one accountable partner. Velakron exists to make that happen.'
      />

      <div className='realitySection__grid'>
        <div className='realitySection__copy'>
          <h3>The Reality Of Modern Manufacturing</h3>
          <p>Large OEMs don&apos;t struggle because they lack suppliers. They struggle because managing suppliers has become a full-time engineering project.</p>
          <p className='technicalLabel'>Common Challenges</p>
          <ul>
            {commonChallenges.map(challenge => (
              <li key={challenge}><span><Check aria-hidden='true' /></span>{challenge}</li>
            ))}
          </ul>
          <strong>Velakron exists to eliminate those problems.</strong>
        </div>

        <PicCont
          className='realitySection__image'
          src='/images/machining.png'
          alt='Multi-axis CNC machining of a steel component'
          fill
          sizes='(max-width: 760px) 100vw, 50vw'
        />
      </div>
    </div>
  </section>
)

export default RealitySection
