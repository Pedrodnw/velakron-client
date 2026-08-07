import Seo from '../components/Seo'
import CapabilitiesSection from '../components/home/CapabilitiesSection'
import ClosingSection from '../components/home/ClosingSection'
import HeroSection from '../components/home/HeroSection'
import ProcessSection from '../components/home/ProcessSection'
import RealitySection from '../components/home/RealitySection'

const description = 'Velakron takes ownership of engineering, manufacturing, quality, and production execution—from initial requirements through final delivery.'

const Home = () => <>
  <Seo title='Home' description={description} />
  <HeroSection />
  <RealitySection />
  <ProcessSection />
  <CapabilitiesSection />
  <ClosingSection />
</>

export default Home
