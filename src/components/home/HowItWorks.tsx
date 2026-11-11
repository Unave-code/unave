import React from 'react'

import { StepRail } from '@/components/StepRail'
import { STEPS, STEPS_HEADING, STEPS_INTRO } from '@/utilities/homeCopy'

import { Section } from './Section'

/**
 * The four steps as one infographic rail on the tinted band (design.md §6.6).
 *
 * The band is tinted rather than cream so the rail reads as a chart of the order
 * and not as four more loose cards between two white sections. The steps
 * themselves are drawn by the shared `StepRail`, the same one our-kitchen uses,
 * so the site has one way of showing a sequence.
 */
export const HowItWorks: React.FC = () => (
  <Section id="how-it-works" tone="tint">
    <h2 className="text-h2">{STEPS_HEADING}</h2>
    <p className="text-body text-ink-600 mt-4 max-w-[58ch]">{STEPS_INTRO}</p>

    <StepRail steps={STEPS} surface="tint" />
  </Section>
)
