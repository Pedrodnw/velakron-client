import { ArrowRight, Building2, Factory, LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import FormField from '../components/auth/FormField'
import FormMessage from '../components/auth/FormMessage'
import { resultError } from '../components/auth/utils'
import { Button, VelakronLogo } from '../components/design-system'
import Seo from '../components/Seo'
import { startTradeShowDemo } from '../store/slices/auth'
import { apiCallBegan } from '../store/api'

const initialForm = {
  full_name: '',
  company_name: '',
  email: '',
  experience: '',
  website: '',
}

const ImtsDemo = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const [form, setForm] = useState(initialForm)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [campaign, setCampaign] = useState(null)

  useEffect(() => {
    if (!router.isReady || !router.query.campaign) return
    let active = true
    dispatch(apiCallBegan({ url: `/sales-demos/public/campaigns/${router.query.campaign}` }))
      .then(result => {
        if (!active) return
        if (!result?.ok) { setError(resultError(result, 'This Sales Demo link is not currently available.')); return }
        const selected = result.payload?.data?.campaign || null
        setCampaign(selected)
        if (selected?.fixed_experience) setForm(value => ({ ...value, experience: selected.fixed_experience }))
      })
    return () => { active = false }
  }, [dispatch, router.isReady, router.query.campaign])

  const update = event => setForm(current => ({
    ...current,
    [event.target.name]: event.target.value,
  }))

  const submit = async event => {
    event.preventDefault()
    setPending(true)
    setError('')
    const result = await dispatch(startTradeShowDemo({
      ...form,
      campaign_slug: String(router.query.campaign || 'imts'),
    }))
    if (!result?.ok) {
      setPending(false)
      setError(resultError(result, 'We could not prepare your demo. Please ask a Velakron team member for help.'))
      return
    }
    await router.replace(result.payload?.data?.redirect_to || '/app')
  }

  return <>
    <Seo
      title='Experience Velakron'
      description='Start a private OEM or Supplier Velakron Sales Demo experience.'
      path={router.query.campaign ? `/sales-demo/${router.query.campaign}` : '/imts-demo'}
      noIndex
    />
    <div className='tradeShowPage'>
      <div className='tradeShowPage__glow tradeShowPage__glow--one' aria-hidden='true' />
      <div className='tradeShowPage__glow tradeShowPage__glow--two' aria-hidden='true' />
      <header className='tradeShowPage__brand'><VelakronLogo priority sizes='156px' /></header>
      <main className='tradeShowExperience'>
        <section className='tradeShowExperience__story'>
          <p className='technicalLabel'>{campaign?.name || 'Live product experience'}</p>
          <h1>See the supply chain from either side.</h1>
          <p>Tell us who you are, choose the view that matches your business, and step into a clean Velakron workspace prepared just for you.</p>
        </section>

        <section className='tradeShowCard' aria-labelledby='imts-demo-form-title'>
          <div className='tradeShowCard__heading'>
            <p className='technicalLabel'>Choose your perspective</p>
            <h2 id='imts-demo-form-title'>Start your Velakron demo</h2>
            <p>No password or setup required.</p>
          </div>
          <form className='tradeShowForm' onSubmit={submit}>
            <FormMessage>{error}</FormMessage>
            <FormField id='imts-demo-name' label='Full name' name='full_name' value={form.full_name} onChange={update} autoComplete='name' maxLength={160} required />
            <FormField id='imts-demo-company' label='Company' name='company_name' value={form.company_name} onChange={update} autoComplete='organization' maxLength={180} required />
            <FormField id='imts-demo-email' label='Business email' name='email' type='email' value={form.email} onChange={update} autoComplete='email' placeholder='you@company.com' maxLength={320} required />
            {campaign?.fixed_experience
              ? <div className='tradeShowRoleChoice tradeShowRoleChoice--fixed'>
                {campaign.fixed_experience === 'oem' ? <Building2 aria-hidden='true' /> : <Factory aria-hidden='true' />}
                <span><strong>{campaign.fixed_experience === 'oem' ? 'OEM experience' : 'Supplier experience'}</strong><small>This campaign opens directly in the {campaign.fixed_experience === 'oem' ? 'OEM' : 'Supplier'} product story.</small></span>
              </div>
              : <fieldset className='tradeShowRoleChoice'>
              <legend>I want to experience Velakron as a…</legend>
              <label className={form.experience === 'oem' ? 'is-selected' : ''}>
                <input type='radio' name='experience' value='oem' checked={form.experience === 'oem'} onChange={update} required />
                <Building2 aria-hidden='true' />
                <span><strong>OEM</strong><small>Track supplier progress, risk, and production commitments.</small></span>
              </label>
              <label className={form.experience === 'supplier' ? 'is-selected' : ''}>
                <input type='radio' name='experience' value='supplier' checked={form.experience === 'supplier'} onChange={update} required />
                <Factory aria-hidden='true' />
                <span><strong>Supplier</strong><small>Manage work, machines, updates, and customer visibility.</small></span>
              </label>
              </fieldset>}
            <label className='tradeShowHoneypot' aria-hidden='true'>Website<input name='website' value={form.website} onChange={update} tabIndex='-1' autoComplete='off' /></label>
            <Button className='tradeShowForm__submit' type='submit' disabled={pending || !form.experience}>
              {pending ? <><LoaderCircle className='spin' aria-hidden='true' /> Preparing your workspace…</> : <>Enter the experience <ArrowRight aria-hidden='true' /></>}
            </Button>
            <p className='tradeShowForm__notice'>By continuing, you agree that Velakron may keep these details to follow up about the product. Your temporary demo remains available for 12 hours.</p>
          </form>
        </section>
      </main>
    </div>
  </>
}

ImtsDemo.getLayout = page => page
export default ImtsDemo
