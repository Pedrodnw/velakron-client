import { Button, VelakronLogo } from '../design-system'

const HeroSection = () => (
  <section className='homeHero'>
    <div className='homeHero__content max'>
      <VelakronLogo className='homeHero__logo' priority sizes='280px' />
      <h1>One Accountable<br />Partner.</h1>
      <p className='homeHero__tagline'>Engineering-Led Manufacturing Solutions.</p>
      <p className='homeHero__summary'>
        Velakron takes ownership of engineering, manufacturing, quality, and production execution—delivering reliable outcomes from initial requirements through final delivery.
      </p>
      <div className='homeHero__actions'>
        <Button href='/contact' showArrow>Discuss Your Manufacturing Challenge</Button>
        <Button href='/capabilities' variant='secondary'>Our Capabilities</Button>
      </div>
    </div>
    <div className='homeHero__accountability'>
      <div className='max'>
        <strong>Singular Accountability.</strong>
        <p>OEMs don&apos;t need more suppliers—they need one accountable partner that unifies engineering, manufacturing, quality, and delivery into a single reliable process.</p>
      </div>
    </div>
  </section>
)

export default HeroSection
