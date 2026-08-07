import { createEntitySelectors, createNormalizedEntitySlice } from './createEntitySlice'

const slice = createNormalizedEntitySlice({ name: 'foundationEntities' })

export const foundationEntityActions = slice.actions
export const foundationEntitySelectors = createEntitySelectors('foundation')

export default slice.reducer

