import Seo from '../components/Seo'
import VisibilityLandingPage from '../components/home/VisibilityLandingPage'

const description = 'Velakron gives OEMs real-time visibility into every part, every machine, and every supplier—so teams can make faster decisions and keep production moving.'

const Home = () => <>
  <Seo title='Stop asking. Start knowing.' description={description} />
  <VisibilityLandingPage />
</>

Home.getLayout = page => page

export default Home
