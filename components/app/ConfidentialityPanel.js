import { Check, FileSignature, LockKeyhole, ShieldAlert, ShieldCheck, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import FormField from '../auth/FormField'
import FormMessage from '../auth/FormMessage'
import { Button } from '../design-system'
import ConfidentialityBadge, { confidentialityLabel } from './ConfidentialityBadge'
import StatusBadge from './StatusBadge'
import { formatDateTime, formatLabel } from './formatters'

const ndaHref = path => path ? `${process.env.NEXT_PUBLIC_API_URL || ''}${path}` : null

const NdaDocument = ({ document, scope }) => {
  if (!document) return null
  return <article className='confidentialityDocument'>
    <FileSignature aria-hidden='true' />
    <div>
      <strong>{document.original_filename}</strong>
      <span>{scope} NDA · {(document.byte_size / 1024).toFixed(1)} KB · SHA-256 {document.sha256?.slice(0, 12)}…</span>
    </div>
    {document.content_path && <a className='vk-button vk-button--secondary' href={ndaHref(document.content_path)} target='_blank' rel='noreferrer'>Open {scope} NDA PDF</a>}
  </article>
}

const RequirementTerms = ({ confidentiality }) => <div className='confidentialityTerms'>
  {confidentiality.relationship_requirement && <section>
    <p className='technicalLabel'>Relationship requirement · version {confidentiality.relationship_requirement.version_number}</p>
    <pre>{confidentiality.relationship_requirement.policy_snapshot}</pre>
    <NdaDocument document={confidentiality.relationship_requirement.custom_nda} scope='Relationship' />
  </section>}
  {confidentiality.requirement && <section>
    <p className='technicalLabel'>Production requirement · version {confidentiality.requirement.version_number}</p>
    <pre>{confidentiality.requirement.policy_snapshot}</pre>
    <NdaDocument document={confidentiality.requirement.custom_nda} scope='Historical production' />
  </section>}
</div>

const SigningForm = ({ confidentiality, pending, feedback, onSign }) => {
  const [form, setForm] = useState({
    legal_name: '',
    business_title: '',
    authority_confirmed: false,
    signature_intent_confirmed: false,
    level_understood: false,
    documents_reviewed_confirmed: false,
    authorized_membership_ids: [],
  })
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const toggleMember = id => setForm(current => ({
    ...current,
    authorized_membership_ids: current.authorized_membership_ids.includes(id)
      ? current.authorized_membership_ids.filter(value => value !== id)
      : [...current.authorized_membership_ids, id],
  }))
  const complete = form.legal_name.trim().length > 1
    && form.business_title.trim().length > 1
    && form.authority_confirmed
    && form.signature_intent_confirmed
    && form.level_understood
    && (!confidentiality.requires_document_review || form.documents_reviewed_confirmed)
    && (confidentiality.level !== 'restricted' || form.authorized_membership_ids.length > 0)

  return <form className='confidentialitySigningForm' onSubmit={event => { event.preventDefault(); onSign(form) }}>
    <header>
      <FileSignature aria-hidden='true' />
      <div><p className='technicalLabel'>Supplier administrator action</p><h3>Sign for your company</h3><p>Enter your own identity and make each confirmation deliberately.</p></div>
    </header>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <div className='productionFormGrid'>
      <FormField id='confidentiality-legal-name' label='Full legal name' value={form.legal_name} onChange={event => set('legal_name', event.target.value)} autoComplete='name' required />
      <FormField id='confidentiality-business-title' label='Business title' value={form.business_title} onChange={event => set('business_title', event.target.value)} required />
    </div>
    {confidentiality.level === 'restricted' && <fieldset className='confidentialityRoster'>
      <legend>Initial authorized users</legend>
      <p>Only selected people will be able to open the production details, notes, or files. Administrators are not included automatically.</p>
      {confidentiality.authorized_memberships.map(member => <label key={member.id}>
        <input type='checkbox' checked={form.authorized_membership_ids.includes(member.id)} onChange={() => toggleMember(member.id)} />
        <span><strong>{member.name}</strong><small>{member.email} · {formatLabel(member.role)}</small></span>
      </label>)}
    </fieldset>}
    <div className='confidentialityConfirmations'>
      <label><input type='checkbox' checked={form.authority_confirmed} onChange={event => set('authority_confirmed', event.target.checked)} /><span>{confidentiality.statements.authority}</span></label>
      <label><input type='checkbox' checked={form.signature_intent_confirmed} onChange={event => set('signature_intent_confirmed', event.target.checked)} /><span>{confidentiality.statements.signature_intent}</span></label>
      <label><input type='checkbox' checked={form.level_understood} onChange={event => set('level_understood', event.target.checked)} /><span>{confidentiality.statements.level_acknowledgement}</span></label>
      {confidentiality.requires_document_review && <label><input type='checkbox' checked={form.documents_reviewed_confirmed} onChange={event => set('documents_reviewed_confirmed', event.target.checked)} /><span>{confidentiality.statements.document_review}</span></label>}
    </div>
    <Button type='submit' disabled={pending || !complete}><FileSignature aria-hidden='true' /> Sign and accept confidentiality requirements</Button>
  </form>
}

const RosterManager = ({ members, pending, feedback, onSave }) => {
  const initial = useMemo(() => members.filter(member => member.selected).map(member => member.id), [members])
  const [selected, setSelected] = useState(initial)
  const [reason, setReason] = useState('')
  useEffect(() => setSelected(initial), [initial])
  const toggle = id => setSelected(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  return <form className='confidentialityRoster confidentialityRoster--manager' onSubmit={event => { event.preventDefault(); onSave({ authorized_membership_ids: selected, reason }) }}>
    <h3>Named supplier users</h3>
    <p>Changes take effect on the person’s next request. Removing someone immediately blocks new views and downloads.</p>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    {members.map(member => <label key={member.id}><input type='checkbox' checked={selected.includes(member.id)} onChange={() => toggle(member.id)} /><span><strong>{member.name}</strong><small>{member.email} · {formatLabel(member.role)}</small></span></label>)}
    <FormField id='restricted-roster-reason' label='Reason for this roster update' value={reason} onChange={event => setReason(event.target.value)} hint='Included in the access audit trail.' />
    <Button type='submit' disabled={pending || !selected.length}><UsersRound aria-hidden='true' /> Save authorized users</Button>
  </form>
}

const OemControls = ({ confidentiality, pending, feedback, onConfigure }) => {
  const [level, setLevel] = useState(confidentiality.level || 'confidential')
  const [reason, setReason] = useState('')
  const [overrideRelationshipDefault, setOverrideRelationshipDefault] = useState(false)
  useEffect(() => setLevel(confidentiality.level || 'confidential'), [confidentiality.level])
  const weakensRelationshipDefault = confidentiality.relationship_default_level === 'restricted'
    && level === 'confidential'
  return <div className='confidentialityOemControls'>
    {confidentiality.can_configure && <form onSubmit={event => { event.preventDefault(); onConfigure({ level, reason, override_relationship_default: overrideRelationshipDefault }) }}>
      <label className='selectField' htmlFor='production-confidentiality-level'><span>Required confidentiality level</span><select id='production-confidentiality-level' value={level} onChange={event => { setLevel(event.target.value); setOverrideRelationshipDefault(false) }}><option value='confidential'>Confidential — supplier team</option><option value='restricted'>Restricted — named supplier users only</option></select></label>
      {weakensRelationshipDefault && <label className='productionCheck'><input type='checkbox' checked={overrideRelationshipDefault} onChange={event => setOverrideRelationshipDefault(event.target.checked)} disabled={!confidentiality.can_override_relationship_default} /><span><strong>Override this supplier relationship’s Restricted default</strong><small>{confidentiality.can_override_relationship_default ? 'This production record will use the lower Confidential level. The reason below is required and will be audited.' : 'Only an OEM administrator can approve this exception.'}</small></span></label>}
      <FormField id='production-confidentiality-reason' label='Reason for this requirement or change' value={reason} onChange={event => setReason(event.target.value)} hint='Required when the selected level changes or an accepted requirement is replaced.' />
      <Button type='submit' disabled={pending || (weakensRelationshipDefault && (!confidentiality.can_override_relationship_default || !overrideRelationshipDefault)) || (level === confidentiality.level && confidentiality.state !== 'active')}><ShieldCheck aria-hidden='true' /> Apply requirement</Button>
    </form>}
    <div className='productionNdaLocationNotice'><FileSignature aria-hidden='true' /><div><strong>NDAs apply to the supplier relationship</strong><span>Upload and renew supplier-wide NDAs from the OEM Suppliers workspace. Production-specific confidentiality and Restricted rosters remain here.</span></div><Button href='/app/suppliers' variant='secondary'>Open Suppliers</Button></div>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
  </div>
}

const ConfidentialityPanel = ({
  confidentiality,
  loading,
  pending,
  feedback,
  organizationType,
  onConfigure,
  onSign,
  onRosterSave,
}) => {
  if (loading && !confidentiality) return <section className='appPanel confidentialityPanel'><p>Loading confidentiality requirements…</p></section>
  if (!confidentiality) return null
  const pendingSignature = confidentiality.state === 'pending'
  const receipt = confidentiality.acceptance
  return <section className={`appPanel confidentialityPanel confidentialityPanel--${confidentiality.level}`}>
    <header className='confidentialityPanel__header'>
      <div className='confidentialityPanel__identity'>
        {confidentiality.level === 'restricted' ? <LockKeyhole aria-hidden='true' /> : <ShieldCheck aria-hidden='true' />}
        <div><p className='technicalLabel'>Design confidentiality</p><h2>{confidentialityLabel(confidentiality.level)}</h2></div>
      </div>
      <div className='confidentialityPanel__status'><ConfidentialityBadge level={confidentiality.level} compact /><StatusBadge tone={pendingSignature ? 'warning' : confidentiality.state === 'active' ? 'success' : 'neutral'}>{pendingSignature ? 'Signature required' : formatLabel(confidentiality.state)}</StatusBadge></div>
    </header>
    {confidentiality.locked && <div className='confidentialityLockedNotice'><ShieldAlert aria-hidden='true' /><div><strong>Protected production content is locked</strong><p>{confidentiality.can_sign ? 'Review every applicable term and sign below to unlock access for the permitted supplier users.' : confidentiality.lock_reason === 'CONFIDENTIALITY_ACCESS_RESTRICTED' ? 'You are not on the named access list for this Restricted production record.' : 'A supplier administrator must sign before production details and files become available.'}</p></div></div>}
    <RequirementTerms confidentiality={confidentiality} />
    {receipt && <div className='confidentialityReceiptSummary'><Check aria-hidden='true' /><div><strong>Signed by {receipt.legal_name}</strong><span>{receipt.business_title} · {formatDateTime(receipt.accepted_at)} · requirement version {receipt.requirement_version}</span></div></div>}
    {organizationType === 'supplier' && confidentiality.can_sign && <SigningForm confidentiality={confidentiality} pending={pending} feedback={feedback} onSign={onSign} />}
    {organizationType === 'supplier' && confidentiality.can_manage_roster && <RosterManager members={confidentiality.authorized_memberships || []} pending={pending} feedback={feedback} onSave={onRosterSave} />}
    {organizationType === 'oem' && <OemControls confidentiality={confidentiality} pending={pending} feedback={feedback} onConfigure={onConfigure} />}
    <div className='regulatedDataNotice'><ShieldAlert aria-hidden='true' /><p><strong>Regulated data is not supported.</strong> {confidentiality.regulated_data_notice}</p></div>
  </section>
}

export default ConfidentialityPanel
