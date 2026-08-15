import { LoaderCircle, PanelsTopLeft } from 'lucide-react'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  getActiveExperience,
  getAvailableExperiences,
  getExperienceSwitching,
  switchExperience,
} from '../../store/slices/appContext'

const labels = {
  founder: 'Founder',
  velakron_admin: 'Velakron Admin',
}

const ExperienceSwitcher = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const experience = useSelector(getActiveExperience)
  const availableExperiences = useSelector(getAvailableExperiences)
  const switching = useSelector(getExperienceSwitching)
  const [error, setError] = useState('')

  if (availableExperiences.length < 2) return null

  const changeExperience = async event => {
    const nextExperience = event.target.value
    if (!nextExperience || nextExperience === experience) return
    setError('')
    const result = await dispatch(switchExperience(nextExperience))
    if (!result?.ok) {
      setError(result?.error?.message || 'Could not change experience. Please try again.')
      return
    }
    await router.replace(nextExperience === 'velakron_admin' ? '/admin' : '/app')
  }

  return <div className={`experienceSwitcher${error ? ' has-error' : ''}`}>
    <span className='experienceSwitcher__icon'><PanelsTopLeft aria-hidden='true' /></span>
    <label>
      <span>Experience</span>
      <select aria-label='Velakron experience' value={experience || 'founder'} onChange={changeExperience} disabled={switching}>
        {availableExperiences.map(option => <option key={option} value={option}>{labels[option] || option}</option>)}
      </select>
    </label>
    {switching && <LoaderCircle className='spin experienceSwitcher__loading' aria-label='Changing experience' />}
    {error && <span className='experienceSwitcher__error' role='alert'>{error}</span>}
  </div>
}

export default ExperienceSwitcher
