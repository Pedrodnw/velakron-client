// Replace only edited top-level fields; the API retains the rest of the draft.
export const changedTemplateFields = (savedPayload, nextPayload) => {
  const saved = savedPayload ? JSON.parse(savedPayload) : {}
  return Object.fromEntries(Object.entries(nextPayload).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(saved[key])))
}
