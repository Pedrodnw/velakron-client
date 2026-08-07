import TokenConfirmationPage from '../components/auth/TokenConfirmationPage'
import Seo from '../components/Seo'
import { confirmEmailChange, previewEmailChange } from '../store/slices/identity'

const ConfirmEmail = () => <>
  <Seo title='Confirm New Email' description='Confirm a new Velakron sign-in email.' path='/confirm-email' noIndex />
  <TokenConfirmationPage
    eyebrow='Sign-in identity'
    title='Confirm Your New Email.'
    description='Your old address remains active until this confirmation succeeds. Other sessions will then be signed out.'
    panelTitle='Confirm email change'
    preview={previewEmailChange}
    confirm={confirmEmailChange}
    readyMessage={details => `Change your Velakron sign-in address to ${details?.new_email || 'the requested address'}?`}
    successMessage='Your sign-in email has been changed. Please log in again with the new address.'
  />
</>

export default ConfirmEmail
