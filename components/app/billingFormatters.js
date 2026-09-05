const planRanks = ['starter', 'team', 'professional', 'business', 'business_plus', 'enterprise']

export const formatBillingMoney = (cents, currency = 'usd') => cents === null || cents === undefined
  ? 'Custom'
  : new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: String(currency).toUpperCase(),
      maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100)

export const formatBillingDate = value => value
  ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
  : 'Not available'

export const classifyClientPlanChange = (currentCode, targetCode) => {
  if (!currentCode) return 'start'
  if (currentCode === targetCode) return 'current'
  return planRanks.indexOf(targetCode) > planRanks.indexOf(currentCode) ? 'upgrade' : 'downgrade'
}
