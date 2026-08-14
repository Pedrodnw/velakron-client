export const Field = ({ label, hint, children, wide = false }) => <label className={wide ? 'crmField crmField--wide' : 'crmField'}>
  <span>{label}</span>{children}{hint && <small>{hint}</small>}
</label>

export const FieldGrid = ({ children }) => <div className='crmFieldGrid'>{children}</div>

export const OwnerName = ({ membership }) => membership?.user?.full_name || membership?.user?.email || 'Unassigned'

export const formatMoney = value => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 0,
}).format(Number(value || 0))

export const formatShortDate = value => value
  ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
  : 'Not set'

export const formatDateTime = value => value
  ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value))
  : 'Not set'
