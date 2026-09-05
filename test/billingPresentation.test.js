import { describe, expect, it } from 'vitest'
import { classifyClientPlanChange, formatBillingMoney } from '../components/app/billingFormatters'

describe('billing presentation helpers', () => {
  it('formats annual prices without exposing fractional cents', () => {
    expect(formatBillingMoney(150000, 'usd')).toBe('$1,500')
    expect(formatBillingMoney(null, 'usd')).toBe('Custom')
  })

  it('distinguishes enrollment, upgrades, downgrades, and the current plan', () => {
    expect(classifyClientPlanChange(null, 'team')).toBe('start')
    expect(classifyClientPlanChange('team', 'professional')).toBe('upgrade')
    expect(classifyClientPlanChange('business', 'professional')).toBe('downgrade')
    expect(classifyClientPlanChange('team', 'team')).toBe('current')
  })
})
