import { Archive, Building2, Clock3, CopyPlus, Factory, PencilLine, Play, Plus, Search, Share2, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../design-system'
import StatusBadge from '../StatusBadge'
import CrmModal from '../crm/CrmModal'

const idOf = value => String(value?.id || value?._id || value || '')
const payloadOf = template => template?.draft_version?.payload || template?.published_version?.payload || {}
const metadataOf = template => payloadOf(template).presentation || {}

const SalesDemoTemplateLibrary = ({ templates, recipes, working, onCreate, onEdit, onLaunch, onShare, onArchive }) => {
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [startingPoint, setStartingPoint] = useState(recipes[0]?.key || 'advanced-custom')
  const [duplicateId, setDuplicateId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const normalized = search.trim().toLowerCase()
  const visible = useMemo(() => templates.filter(template => {
    const meta = metadataOf(template)
    return !normalized || [template.name, template.description, meta.persona, meta.use_case, ...(meta.tags || [])].join(' ').toLowerCase().includes(normalized)
  }), [normalized, templates])

  const beginCreate = (recipeKey = recipes[0]?.key || 'advanced-custom') => {
    const recipe = recipes.find(item => item.key === recipeKey)
    setStartingPoint(recipeKey)
    setDuplicateId('')
    setName(recipe ? `${recipe.name} copy` : 'Custom sales demo')
    setDescription(recipe?.description || 'A reusable synthetic story prepared for a specific sales conversation.')
    setCreateOpen(true)
  }
  const beginDuplicate = template => {
    setStartingPoint('duplicate')
    setDuplicateId(idOf(template))
    setName(`${template.name} copy`)
    setDescription(template.description || '')
    setCreateOpen(true)
  }
  const submit = async event => {
    event.preventDefault()
    const source = templates.find(item => idOf(item) === duplicateId)
    const created = await onCreate({
      name,
      description,
      recipe_key: startingPoint === 'duplicate' || startingPoint === 'advanced-custom' ? '' : startingPoint,
      clone_version_id: startingPoint === 'duplicate' ? idOf(source?.published_version) : undefined,
    })
    if (created) setCreateOpen(false)
  }

  return <div className='salesDemoTemplateLibrary'>
    <header className='salesDemoSectionHeader'><div><p className='technicalLabel'>Reusable starting points</p><h2>Demo templates</h2><p>Choose a ready story, practice it, or create a version tailored to a prospect's priorities.</p></div><Button onClick={() => beginCreate()}><Plus aria-hidden='true' /> Create template</Button></header>
    <div className='salesDemoLibraryTools'><label><Search aria-hidden='true' /><span className='srOnly'>Search templates</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder='Search by scenario, audience, or feature' /></label><span>{visible.length} template{visible.length === 1 ? '' : 's'}</span></div>
    <section className='salesDemoTemplateGrid'>
      {visible.map(template => {
        const payload = payloadOf(template)
        const meta = metadataOf(template)
        const modules = payload.scenario_modules || []
        const part = payload.part_workspace?.preset_key?.replaceAll('-', ' ') || 'Synthetic part'
        return <article key={idOf(template)}>
          <div className='salesDemoTemplateCard__visual'><Sparkles aria-hidden='true' /><span>{part}</span></div>
          <header><div><h3>{template.name}</h3><p>{template.description || 'Reusable synthetic sales story'}</p></div><StatusBadge tone={template.draft_version && !template.draft_version.validation?.ready ? 'warning' : template.published_version ? 'success' : 'neutral'}>{template.draft_version ? (template.draft_version.validation?.ready ? 'Draft ready' : 'Needs review') : template.published_version ? 'Ready' : 'Draft'}</StatusBadge></header>
          <div className='salesDemoTemplateCard__facts'><span><Clock3 aria-hidden='true' /> {meta.duration_minutes || 20} minutes</span><span><Building2 aria-hidden='true' /> {meta.persona || 'Cross-functional'}</span><span><Factory aria-hidden='true' /> {(template.supported_experiences || ['oem', 'supplier']).map(value => value.toUpperCase()).join(' + ')}</span></div>
          <div className='salesDemoTemplateCard__tags'>{(meta.tags || modules.slice(0, 3)).slice(0, 4).map(tag => <span key={tag}>{String(tag).replaceAll('_', ' ')}</span>)}</div>
          <footer><Button onClick={() => onLaunch(template)} disabled={!template.published_version}><Play aria-hidden='true' /> Start</Button><Button variant='secondary' onClick={() => onEdit(template)}><PencilLine aria-hidden='true' /> Edit</Button><Button variant='secondary' onClick={() => beginDuplicate(template)}><CopyPlus aria-hidden='true' /> Duplicate</Button><Button variant='secondary' onClick={() => onShare(template)} disabled={!template.published_version}><Share2 aria-hidden='true' /> Share</Button><button type='button' className='salesDemoTemplateCard__archive' onClick={() => onArchive(template)} aria-label={`Archive ${template.name}`}><Archive aria-hidden='true' /></button></footer>
          <small>Published v{template.published_version?.version_number || '—'}{template.draft_version ? ` · draft v${template.draft_version.version_number}` : ''} · {template.usage?.sessions || 0} uses{template.usage?.last_used_at ? ` · last used ${new Date(template.usage.last_used_at).toLocaleDateString()}` : ''}</small>
        </article>
      })}
    </section>
    {!visible.length && <div className='salesDemoLibraryEmpty'><strong>No templates match that search.</strong><span>Clear the search or create a new starting point.</span></div>}
    <section className='salesDemoRecipeShelf'><header><p className='technicalLabel'>Velakron recommended</p><h3>Start from a proven sales scenario</h3></header><div>{recipes.map(recipe => <button type='button' onClick={() => beginCreate(recipe.key)} key={recipe.key}><strong>{recipe.name}</strong><span>{recipe.description}</span><small>{recipe.duration_minutes} min · {recipe.persona}</small></button>)}</div></section>

    <CrmModal open={createOpen} wide title='Create a demo template' description='Start from a recommended story, duplicate an existing template, or use the advanced full-data starting point.' onClose={() => !working && setCreateOpen(false)} actions={<><Button variant='secondary' onClick={() => setCreateOpen(false)} disabled={working}>Cancel</Button><Button type='submit' form='sales-demo-template-create' disabled={working}>{working ? 'Creating…' : 'Create editable template'}</Button></>}>
      <form id='sales-demo-template-create' className='salesDemoTemplateCreateFlow' onSubmit={submit}>
        <fieldset><legend>Starting point</legend><div className='salesDemoStartingPoints'>{recipes.map(recipe => <label className={startingPoint === recipe.key ? 'is-selected' : ''} key={recipe.key}><input type='radio' name='starting-point' value={recipe.key} checked={startingPoint === recipe.key} onChange={() => { setStartingPoint(recipe.key); setDuplicateId(''); setName(`${recipe.name} copy`); setDescription(recipe.description) }} /><strong>{recipe.name}</strong><span>{recipe.duration_minutes} minutes · {recipe.persona}</span></label>)}<label className={startingPoint === 'duplicate' ? 'is-selected' : ''}><input type='radio' name='starting-point' value='duplicate' checked={startingPoint === 'duplicate'} onChange={() => setStartingPoint('duplicate')} /><strong>Duplicate an existing template</strong><span>Copy a published version and adapt it safely.</span></label><label className={startingPoint === 'advanced-custom' ? 'is-selected' : ''}><input type='radio' name='starting-point' value='advanced-custom' checked={startingPoint === 'advanced-custom'} onChange={() => { setStartingPoint('advanced-custom'); setDuplicateId('') }} /><strong>Advanced custom template</strong><span>Begin with the complete safe synthetic dataset.</span></label></div></fieldset>
        {startingPoint === 'duplicate' && <label><span>Template to duplicate</span><select required value={duplicateId} onChange={event => setDuplicateId(event.target.value)}><option value=''>Choose template</option>{templates.filter(item => item.published_version).map(item => <option value={idOf(item)} key={idOf(item)}>{item.name} · v{item.published_version.version_number}</option>)}</select></label>}
        <div><label><span>Template name</span><input required minLength={2} maxLength={180} value={name} onChange={event => setName(event.target.value)} /></label><label><span>Purpose</span><textarea required rows={3} maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} /></label></div>
        <aside><strong>Safe by default</strong><p>The new template opens as an unpublished draft. Existing shared links and active demos are never changed until you review and publish it.</p></aside>
      </form>
    </CrmModal>
  </div>
}

export default SalesDemoTemplateLibrary
