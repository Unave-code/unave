import { Check } from 'lucide-react'
import React from 'react'

import { cn } from '@/utilities/ui'

/**
 * One option tile (a plan's duration or a product's size): a soft green button
 * that turns solid brand green with a gold price and a gold check once chosen,
 * so the choice reads at a glance. The radio underneath stays native.
 */
const OPTION_TILE = cn(
  // An outline pill: white with a brand-green border.
  'rounded-pill relative isolate inline-flex min-h-12 items-center gap-2 overflow-hidden border-2 border-green-700 bg-white px-4 py-2 whitespace-nowrap text-green-900',
  'transition-[background-color,border-color,color,box-shadow,translate] duration-200 ease-out',
  // The overlay: a soft green wash that sweeps in from the left on hover.
  "before:absolute before:inset-0 before:-z-10 before:origin-left before:scale-x-0 before:bg-green-700/12 before:transition-transform before:duration-300 before:ease-out before:content-['']",
  'hover:-translate-y-0.5 hover:shadow-sm hover:before:scale-x-100',
  'motion-reduce:before:transition-none',
  'peer-checked:border-green-700 peer-checked:bg-green-700 peer-checked:text-white peer-checked:shadow-md',
  'peer-checked:[&_.tile-price]:text-gold-300 peer-checked:[&_.tile-sub]:text-white/80 peer-checked:[&_.tile-check]:flex',
  'peer-focus-visible:ring-[3px] peer-focus-visible:ring-green-500 peer-focus-visible:ring-offset-2',
  'motion-reduce:transition-none motion-reduce:hover:translate-y-0',
)
const TILE_PRICE = 'tile-price text-sm font-extrabold text-green-700 tabular-nums'
const TILE_SUB = 'tile-sub text-xs text-ink-600 tabular-nums'
/** The quiet dot between a tile's parts. */
const TileDot = () => (
  <span aria-hidden="true" className="tile-sub text-ink-600 text-xs">
    ·
  </span>
)

/** The gold check on the chosen tile; hidden until its radio is checked. */
const TileCheck = () => (
  <span
    aria-hidden="true"
    className="tile-check bg-gold-400 hidden size-5 shrink-0 items-center justify-center rounded-full text-green-900"
  >
    <Check className="size-3" strokeWidth={3} />
  </span>
)

export { TILE_PRICE, TILE_SUB, TileDot }

/**
 * A choice as a row of tiles, like a shop's size choice: native radios named
 * `duration`, so the chosen tile's value goes with the form.
 */
export const OptionTiles: React.FC<{
  className?: string
  legend: React.ReactNode
  onSelect: (index: number) => void
  options: { content: React.ReactNode; key: string; value: string }[]
  selected: number
}> = ({ className, legend, onSelect, options, selected }) => (
  <fieldset className={className}>
    <legend className="text-sm font-bold text-green-900">{legend}</legend>

    <div className="mt-3 flex flex-wrap gap-2.5">
      {options.map((option, index) => (
        <label className="cursor-pointer" key={option.key}>
          <input
            checked={selected === index}
            className="peer sr-only"
            name="duration"
            onChange={() => onSelect(index)}
            type="radio"
            value={option.value}
          />
          <span className={OPTION_TILE}>
            <TileCheck />
            {option.content}
          </span>
        </label>
      ))}
    </div>
  </fieldset>
)
