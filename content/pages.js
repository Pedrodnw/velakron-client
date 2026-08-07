export const informationPages = {
  capabilities: {
    eyebrow: 'Our Capabilities',
    title: 'Engineering-Led Manufacturing Solutions.',
    description: 'One accountable partner unifying engineering, manufacturing, quality, and supplier execution.',
    sections: [
      { title: 'Engineering Solutions', items: ['Automation & Manufacturing Integration', 'Design For Manufacturing (DFM)', 'Intelligent Measurement & Process Control', 'CNC Automation Upgrades', 'CAM Programming & G-Code Generation'] },
      { title: 'Manufacturing Solutions', items: ['Precision Machining', 'Casting Program Management', 'Supplier Management', 'Production Management', 'Tooling Strategy', 'Process Development'] },
      { title: 'Quality & Process Control', items: ['Supplier Qualification', 'Inspection Planning', 'Process Validation', 'Documentation Control', 'Continuous Improvement'] },
      { title: 'Supplier Network', items: ['One Process. Multiple Facilities. Singular Consistency.', 'Standardized manufacturing systems', 'Carefully managed partner network', 'Deployable across qualified facilities'] },
    ],
  },
  quality: {
    eyebrow: 'Quality',
    title: 'Engineering Quality Into Every Part.',
    description: 'Quality is not an inspection step. It is a management system built on control and accountability.',
    sections: [
      { title: 'Document Control', text: 'Controlled documentation ensures every requirement is captured and traceable.' },
      { title: 'Supplier Qualification', text: 'Suppliers are vetted against defined capability and quality standards.' },
      { title: 'Process Validation', text: 'Processes are validated to deliver repeatable, predictable results.' },
      { title: 'Inspection Planning', text: 'Inspection strategy is planned upfront and aligned to critical features and tolerances.' },
      { title: 'Corrective Action', text: 'Structured corrective action drives root-cause resolution, not symptom patching.' },
      { title: 'Continuous Improvement', text: 'Ongoing improvement keeps quality and capability advancing over time.' },
      { title: 'Building Toward AS9100 Certification', text: 'Velakron is developing a quality management system designed to support future AS9100 certification.' },
    ],
  },
  about: {
    eyebrow: 'About Velakron',
    title: "Manufacturing Shouldn't Require Managing Ten Different Companies.",
    description: 'Velakron bridges engineering, manufacturing, quality, and supplier execution under one accountable organization.',
    sections: [
      { title: 'Keve Shoemaker', subtitle: 'Founder | Engineering & Manufacturing', text: 'Keve brings more than 20 years of manufacturing and automation experience spanning CNC machining, process development, automation integration, quality improvement, and production execution.' },
      { title: 'Jenny Shoemaker', subtitle: 'Founder | Business Operations & Customer Experience', text: 'Jenny leads business operations, customer experience, organizational systems, and strategic development for Velakron.' },
      { title: 'Our Network', text: 'Velakron integrates capable manufacturing partners into a managed system delivered through engineering ownership and operational excellence.' },
    ],
  },
  faq: {
    eyebrow: 'Frequently Asked Questions',
    title: 'Manufacturing Questions. Straight Answers.',
    description: 'Clear answers about the Velakron operating model, quality approach, and engagement process.',
    sections: [
      { title: 'Are you a machine shop?', text: 'Velakron is an engineering-led manufacturing partner. We develop the strategy, coordinate qualified manufacturing resources, manage quality, and remain accountable for execution.' },
      { title: 'Are you a broker?', text: 'Velakron does more than connect buyers and suppliers. The company takes engineering and operational ownership of the manufacturing process.' },
      { title: 'Are you AS9100 certified?', text: 'Velakron is building a quality management system toward future AS9100 certification; the company does not currently present itself as certified.' },
      { title: 'Can you work with our existing suppliers?', text: 'Velakron can evaluate a program around the customer’s existing resources and the supplier structure required for successful execution.' },
      { title: 'Can you sign an NDA?', text: 'NDA conversations can begin before sensitive drawings or proprietary information are shared.' },
      { title: 'What industries do you serve?', text: 'Aerospace, defense, robotics and automation, industrial equipment, medical devices, and advanced manufacturing.' },
      { title: 'How do I start working with Velakron?', text: 'Begin with a manufacturing challenge discussion or submit a request for quote.' },
    ],
  },
  contact: {
    eyebrow: 'Contact',
    title: 'Discuss Your Manufacturing Challenge.',
    description: 'Tell us about your project and objectives. A member of the Velakron team typically responds within one business day.',
    sections: [
      { title: 'Location', text: 'Vancouver, WA, USA' },
      { title: 'Email', text: 'info@velakron.com', href: 'mailto:info@velakron.com' },
      { title: 'Confidentiality', text: 'Sensitive technical information and drawings are not required for an initial discussion. NDA conversations can begin before proprietary information is shared.' },
    ],
  },
  rfq: {
    eyebrow: 'Request For Quote',
    title: 'Tell Us What You Need To Build.',
    description: 'Share the available requirements, timing, quantity, and manufacturing challenge. The Velakron team will review the opportunity and follow up.',
    sections: [
      { title: 'Start An RFQ', text: 'Send an initial request to info@velakron.com. Proprietary drawings are not required until confidentiality expectations are established.', href: 'mailto:info@velakron.com?subject=Request%20For%20Quote' },
      { title: 'Helpful Details', items: ['Company and primary contact', 'Part or assembly description', 'Expected quantities', 'Target schedule', 'Material or process requirements', 'Quality and documentation expectations'] },
    ],
  },
  supplier: {
    eyebrow: 'Supplier Network',
    title: 'Become A Velakron Supplier.',
    description: 'Velakron is building a carefully managed network of exceptional manufacturing partners.',
    sections: [
      { title: 'Supplier Portal', text: 'The supplier qualification portal is currently under development.' },
      { title: 'Become A Supplier', text: 'Contact supplier@velakron.com to introduce your capabilities and begin the qualification conversation.', href: 'mailto:supplier@velakron.com' },
    ],
  },
}

export const informationPageSlugs = Object.keys(informationPages)
