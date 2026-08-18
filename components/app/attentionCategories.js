export const ATTENTION_CATEGORIES = Object.freeze([
  Object.freeze({
    value: 'non_conformance',
    label: 'Non-conformance',
    description: 'A delivered or in-process result does not meet the agreed requirement or specification.',
    riskLabel: 'High risk',
    tone: 'danger',
  }),
  Object.freeze({
    value: 'production_block',
    label: 'Production block',
    description: 'Work cannot continue until the other company responds or removes the blocker.',
    riskLabel: 'High risk',
    tone: 'danger',
  }),
  Object.freeze({
    value: 'issue',
    label: 'Issue',
    description: 'Follow-up is required, but production is not currently blocked.',
    riskLabel: 'Medium risk',
    tone: 'warning',
  }),
  Object.freeze({
    value: 'information_flag',
    label: 'Information flag',
    description: 'Shared for awareness only; it does not change the schedule risk.',
    riskLabel: 'No schedule risk',
    tone: 'info',
  }),
])

export const attentionCategoryFor = value => ATTENTION_CATEGORIES.find(item => item.value === value) || null
