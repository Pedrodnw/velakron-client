import { Button } from '../design-system'

const ClosingSection = () => (
  <section className='closingSection gridBackground'>
    <div className='max'>
      <div className='closingSection__copy'>
        <p className='technicalLabel'>One Accountable Partner.</p>
        <h2>From Concept To Production,<br />We Own The Outcome.</h2>
        <h3>One Partner. One Process. One Outcome.</h3>
        <p>Your team shouldn&apos;t have to manage multiple suppliers, resolve communication gaps, and coordinate production details across separate organizations. Velakron takes ownership of the process so your team can stay focused on building products.</p>
        <Button href='/contact' showArrow>Start The Conversation</Button>
      </div>
    </div>
  </section>
)

export default ClosingSection
