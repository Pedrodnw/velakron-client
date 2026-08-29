import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppPageHeader, PermissionDenied } from '../../../components/app'
import ProductionRecordForm from '../../../components/app/ProductionRecordForm'
import PortalPageLayout from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import { resultError } from '../../../components/auth/utils'
import { Button } from '../../../components/design-system'
import { getActiveOrganization, getHasPermission } from '../../../store/slices/appContext'
import { relationshipSelectors, loadRelationships } from '../../../store/slices/entities/relationships'
import { createProductionRecord, loadProductionWorkflow, productionRecordSelectors } from '../../../store/slices/entities/productionRecords'
import { loadParts, partSelectors } from '../../../store/slices/entities/parts'

const NewProductionRecord = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const organization = useSelector(getActiveOrganization)
  const allowed = useSelector(getHasPermission('production_record.create'))
  const relationships = useSelector(relationshipSelectors.getEntities)
  const pending = useSelector(productionRecordSelectors.getMutating)
  const workflow = useSelector(productionRecordSelectors.getWorkflow)
  const partWorkspaces = useSelector(partSelectors.getParts)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    if (allowed && organization?.type === 'oem') {
      dispatch(loadRelationships(organization.id))
      dispatch(loadProductionWorkflow())
      dispatch(loadParts({ state: 'active', page_size: 100 }))
    }
  }, [allowed, dispatch, organization?.id, organization?.type])

  if (!allowed || organization?.type !== 'oem') return <PermissionDenied />

  const submit = async payload => {
    setFeedback(null)
    const result = await dispatch(createProductionRecord(payload))
    if (!result?.ok) {
      setFeedback({ type: 'error', message: resultError(result, 'We could not save this production record.') })
      return
    }
    const id = result.payload?.data?.record?.id
    if (id) router.push(`/app/production/${id}`)
  }

  return <>
    <Seo title='New production record' description='Create an awarded manufacturing commitment.' path='/app/production/new' noIndex />
    <Button href='/app/production' variant='secondary' className='backButton'><ArrowLeft aria-hidden='true' /> Production</Button>
    <AppPageHeader eyebrow='Awarded work' title='New production record' description='Capture one awarded PO-line commitment, save it privately as a draft, or assign it to an active connected supplier.' />
    <ProductionRecordForm relationships={relationships} partWorkspaces={partWorkspaces} initialPartRevisionId={String(router.query.part_revision_id || '')} pending={pending} feedback={feedback} workflow={workflow} itarCapability={workflow?.compliance?.itar} onSubmit={submit} />
  </>
}

NewProductionRecord.getLayout = PortalPageLayout
export default NewProductionRecord
