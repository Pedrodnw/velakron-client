import { Building2, LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import {
  getActiveOrganization,
  getAvailableMemberships,
  getOrganizationSwitching,
  switchOrganization,
} from '../../store/slices/appContext'

const OrganizationSwitcher = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const organization = useSelector(getActiveOrganization)
  const memberships = useSelector(getAvailableMemberships)
  const switching = useSelector(getOrganizationSwitching)
  const options = memberships.filter(item => (
    item.status === 'active' && (
      item.organization?.status === 'active'
      || (item.organization?.type === 'supplier' && item.organization?.status === 'pending')
    )
  ))

  const changeOrganization = async event => {
    const organizationId = event.target.value
    if (!organizationId || organizationId === organization?.id) return
    const result = await dispatch(switchOrganization(organizationId))
    if (result?.ok) await router.replace('/app')
  }

  return <div className='organizationSwitcher'>
    <span className='organizationSwitcher__icon'><Building2 aria-hidden='true' /></span>
    <label>
      <span>Organization</span>
      {options.length > 1
        ? <select
            aria-label='Active organization'
            value={organization?.id || ''}
            onChange={changeOrganization}
            disabled={switching}
          >
            {options.map(item => <option key={item.id} value={item.organization.id}>
              {item.organization.name}
            </option>)}
          </select>
        : <strong>{organization?.name || options[0]?.organization?.name || 'No workspace'}</strong>}
    </label>
    {switching && <LoaderCircle className='spin organizationSwitcher__loading' aria-label='Switching organization' />}
  </div>
}

export default OrganizationSwitcher
