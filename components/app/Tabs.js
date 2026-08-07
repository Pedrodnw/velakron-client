const Tabs = ({ items, activeKey, onChange, label = 'View options' }) => <div className='appTabs' role='tablist' aria-label={label}>
  {items.map(item => <button
    key={item.key}
    type='button'
    role='tab'
    aria-selected={item.key === activeKey}
    className={item.key === activeKey ? 'is-active' : ''}
    onClick={() => onChange(item.key)}
  >
    {item.label}
    {item.count !== undefined && <span>{item.count}</span>}
  </button>)}
</div>

export default Tabs
