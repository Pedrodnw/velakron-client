import Seo from '../components/Seo'
import { Button } from '../components/design-system'

const NotFound = () => <div className='notFound gridBackground'>
  <Seo title='Page Not Found' description='The requested Velakron page could not be found.' path='/404' />
  <div className='max'>
    <p className='technicalLabel'>404</p>
    <h1>That Page Is Not In Production.</h1>
    <p>Return to the Velakron homepage or start a manufacturing conversation.</p>
    <Button href='/'>Return Home</Button>
  </div>
</div>

export default NotFound
