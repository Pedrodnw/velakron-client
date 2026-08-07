import {
  Bot,
  Boxes,
  Cog,
  Cpu,
  Crosshair,
  Factory,
  HeartPulse,
  Network,
  Plane,
  ShieldCheck,
  Wrench,
} from 'lucide-react'
import { capabilities, industries } from '../../content/home'
import { SectionHeading } from '../design-system'

const icons = {
  bot: Bot,
  boxes: Boxes,
  cog: Cog,
  cpu: Cpu,
  crosshair: Crosshair,
  factory: Factory,
  network: Network,
  plane: Plane,
  pulse: HeartPulse,
  shield: ShieldCheck,
  wrench: Wrench,
}

const CapabilitiesSection = () => (
  <section className='capabilitiesSection gridBackground'>
    <div className='max'>
      <SectionHeading
        eyebrow='Capabilities'
        title='Engineering-Led Capabilities'
        description='Integrated solutions delivered through a managed manufacturing system.'
      />

      <div className='capabilitiesSection__grid'>
        {capabilities.map(capability => {
          const Icon = icons[capability.icon]
          return <article className='capabilityCard' key={capability.title}>
            <span><Icon aria-hidden='true' /></span>
            <h3>{capability.title}</h3>
            <p>{capability.description}</p>
          </article>
        })}
      </div>

      <p className='technicalLabel capabilitiesSection__label'>Industries We Serve</p>
      <div className='industriesGrid'>
        {industries.map(industry => {
          const Icon = icons[industry.icon]
          return <div className='industryCard' key={industry.label}>
            <Icon aria-hidden='true' />
            <span>{industry.label}</span>
          </div>
        })}
      </div>
    </div>
  </section>
)

export default CapabilitiesSection
