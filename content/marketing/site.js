export const siteOrigin = 'https://velakron.com'
export const navigation = [
  ['How it works', '/how-it-works'], ['For OEMs', '/for-oems'],
  ['For suppliers', '/for-suppliers'], ['Early Access', '/early-access'], ['About', '/about'],
]
export const footerGroups = [
  ['Product', [['How it works', '/how-it-works'], ['For OEMs', '/for-oems'], ['For suppliers', '/for-suppliers'], ['Quality', '/quality'], ['Security', '/security']]],
  ['Get started', [['Early Access', '/early-access'], ['Visibility assessment', '/visibility-assessment'], ['Request a demo', '/request-demo'], ['Log in', '/login']]],
  ['Company & resources', [['About', '/about'], ['Insights', '/insights'], ['FAQ', '/faq'], ['Contact', '/contact']]],
]
export const publicRoutes = ['/', ...navigation.map(([,href]) => href), '/insights', '/contact', '/quality', '/security', '/faq', '/privacy', '/terms', '/acceptable-use', '/visibility-assessment', '/request-demo']
export const workflow = [
  ['Assign the work', 'OEM', 'Bring the part, revision, quantity, required arrival, and chosen supplier into one production record.'],
  ['Confirm the commitment', 'Supplier', 'Accept the work and share the expected ship date so both teams can plan around the same commitment.'],
  ['Report progress', 'Supplier', 'Update the current stage and expected dates as work moves through production.'],
  ['Resolve questions', 'Both teams', 'Discuss the part in context, identify who needs to respond, and keep decisions with the work.'],
  ['Keep the history', 'Both teams', 'Carry inspection evidence and the handoff history through shipment, receipt, and OEM review.'],
]
export const commonFaqs = [
  ['What is Velakron?', 'Velakron is shared production visibility and collaboration software for OEMs and manufacturing suppliers. It brings awarded work, progress updates, part context, conversations, and quality evidence into a connected workflow.'],
  ['Does Velakron replace our ERP?', 'Velakron works alongside your internal planning and business systems. It focuses on the shared production workflow between companies. Direct ERP integrations are outside the current Early Access scope.'],
  ['Do suppliers need to participate?', 'Yes. Shared visibility depends on participating suppliers keeping relevant progress and conversations current. We discuss a practical starting group and onboarding support during qualification.'],
  ['Is Early Access paid?', 'Yes. Selected partners receive a scoped, discounted offer after we discuss fit, participating teams, and the production cycle. Applying does not start a subscription or commit you to a purchase.'],
  ['Can we upload export-controlled data?', 'The current environment is not approved for classified information, ITAR or other export-controlled technical data, or CUI. Do not upload or include those materials in an application. If you have a controlled-data requirement, describe the category only so we can discuss the limitation.'],
  ['Can a supplier apply independently?', 'Yes. Tell us about your customer-update workflow and whether an OEM partner is interested. We will discuss a useful shared starting point rather than assuming every applicant is an OEM.'],
]
