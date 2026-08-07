import TokenConfirmationPage from '../components/auth/TokenConfirmationPage'
import Seo from '../components/Seo'
import { previewVerification, verifyEmail } from '../store/slices/identity'

const VerifyEmail = () => <>
  <Seo title='Verify Email' description='Verify your Velakron email address.' path='/verify-email' noIndex />
  <TokenConfirmationPage
    eyebrow='Identity verification'
    title='Confirm Your Email.'
    description='Verification protects your company workspace and activates accepted invitations.'
    panelTitle='Verify email address'
    preview={previewVerification}
    confirm={verifyEmail}
    readyMessage={details => `Confirm ${details?.email || 'this email address'} for your Velakron account.`}
    successMessage='Your email is verified and your accepted company access is now active.'
  />
</>

export default VerifyEmail
