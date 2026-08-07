const FilterBar = ({ children, actions, label = 'Filters', onSubmit }) => {
  const Component = onSubmit ? 'form' : 'section'
  return <Component className='filterBar' aria-label={label} onSubmit={onSubmit}>
    <div className='filterBar__fields'>{children}</div>
    {actions && <div className='filterBar__actions'>{actions}</div>}
  </Component>
}

export default FilterBar
