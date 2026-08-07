const StatusBadge = ({ children, tone = 'neutral' }) => (
  <span className={`statusBadge statusBadge--${tone}`}>{children}</span>
)

export default StatusBadge
