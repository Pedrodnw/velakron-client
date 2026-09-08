import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'

const FormMessage = ({ type = 'error', children }) => {
  if (!children) return null

  const Icon = type === 'error' ? AlertCircle : type === 'warning' ? AlertTriangle : CheckCircle2

  return <div className={`formMessage formMessage--${type}`} role={type === 'error' ? 'alert' : 'status'}>
    <Icon aria-hidden='true' />
    <span>{children}</span>
  </div>
}

export default FormMessage
