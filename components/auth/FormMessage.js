import { AlertCircle, CheckCircle2 } from 'lucide-react'

const FormMessage = ({ type = 'error', children }) => {
  if (!children) return null

  return <div className={`formMessage formMessage--${type}`} role={type === 'error' ? 'alert' : 'status'}>
    {type === 'error' ? <AlertCircle aria-hidden='true' /> : <CheckCircle2 aria-hidden='true' />}
    <span>{children}</span>
  </div>
}

export default FormMessage
