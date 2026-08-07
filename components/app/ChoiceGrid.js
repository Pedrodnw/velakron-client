const ChoiceGrid = ({ legend, options = [], values = [], onChange, disabled = false }) => {
  const selected = new Set(values)
  const toggle = key => onChange(selected.has(key)
    ? values.filter(value => value !== key)
    : [...values, key])

  return <fieldset className='choiceGrid' disabled={disabled}>
    <legend>{legend}</legend>
    <div>{options.map(option => <label key={option.key} className={selected.has(option.key) ? 'is-selected' : ''}>
      <input type='checkbox' checked={selected.has(option.key)} onChange={() => toggle(option.key)} />
      <span>{option.label}</span>
    </label>)}</div>
  </fieldset>
}

export default ChoiceGrid
