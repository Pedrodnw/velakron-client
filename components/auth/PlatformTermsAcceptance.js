import LinkWrap from '../LinkWrap'

const PlatformTermsAcceptance = ({ terms, checked, onChange, required = true }) => {
  if (!terms) return null
  return <div className='platformTermsAcceptance'>
    <label>
      <input
        type='checkbox'
        checked={checked}
        onChange={event => onChange(event.target.checked)}
        required={required}
      />
      <span>
        I have read and agree to the <LinkWrap href='/confidentiality-terms' target='_blank' rel='noreferrer'>Velakron Platform Confidentiality Terms</LinkWrap>. I agree to protect documents shared through Velakron and use them only for authorized manufacturing work.
      </span>
    </label>
    <small>Version {terms.version} · Effective {terms.effective_on}</small>
  </div>
}

export default PlatformTermsAcceptance
