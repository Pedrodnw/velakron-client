export const applyApprovedPart = (record, preset) => preset ? {
  ...record, partNumber: preset.part_number, partName: preset.name, revision: preset.revision,
} : record

export const normalizeApprovedParts = (payload, presets) => ({
  ...payload,
  production_records: payload.production_records.map(record => {
    const featured = record.key === payload.part_workspace?.production_record_key
      ? presets.find(preset => preset.key === payload.part_workspace.preset_key) : null
    const preset = featured || presets.find(item => item.part_number === record.partNumber || item.legacy_part_numbers?.includes(record.partNumber))
    return applyApprovedPart(record, preset)
  }),
})

export const selectApprovedPart = (payload, index, preset) => !preset ? payload : {
  ...payload,
  part_workspace: payload.production_records[index].key === payload.part_workspace?.production_record_key
    ? { ...payload.part_workspace, preset_key: preset.key } : payload.part_workspace,
  production_records: payload.production_records.map((record, row) => row === index ? applyApprovedPart(record, preset) : record),
}
