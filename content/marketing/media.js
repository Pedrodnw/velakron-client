import dimensions from './mediaDimensions.json'
// Published derivatives only. Capture provenance lives in docs/acceptance/public-site/media-manifest.json.
const figure = (file, alt, caption, width = 1600, height = 1100) => ({ src: `/images/marketing/${file}.webp`, alt, caption, width: dimensions[file]?.width || width, height: dimensions[file]?.height || height })
export const productMedia = {
  overview: figure('oem-overview', 'OEM dashboard showing production records, supplier progress, and work requiring attention.', 'A shared view of production and the records that need attention.'),
  worklist: figure('oem-worklist-vlk', 'OEM production worklist with supplier, stage, and schedule information.', 'Find the production commitments that need a closer look.'),
  record: figure('production-record', 'Production record with part context, current stage, required arrival, and supplier commitment.', 'The part, progress, and dates stay connected to the same production record.'),
  conversation: figure('part-conversation', 'A manufacturing discussion beside the relevant part and revision.', 'Keep the manufacturing question beside the context needed to answer it.'),
  issue: figure('production-issue', 'A supplier production record showing a production block and the company responsible for the next response.', 'A production block makes the restriction and next response visible.'),
  inspection: figure('inspection-evidence', 'Inspection results and quality review for a production record.', 'A recorded inspection result and its accepted review package stay with the work.'),
  supplier: figure('supplier-worklist-vlk', 'Supplier worklist showing production commitments for connected OEM customers.', 'One place to keep connected customers informed about their work.'),
  update: figure('supplier-update-vlk', 'Supplier shipping update for VLK-1001 with its structural-ring model thumbnail visible.', 'Report progress on the record both companies use.'),
  mobile: figure('supplier-mobile', 'The actual supplier production view in a mobile browser.', 'Production context in the mobile browser.', 780, 1688),
  history: figure('production-history-vlk', 'Completed VLK-5001 production workflow and its retained update history.', 'A record of the updates and decisions that brought the work here.'),
}
