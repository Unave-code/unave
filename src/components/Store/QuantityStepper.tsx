import { Minus, Plus } from 'lucide-react'
import React from 'react'

import { CART_MAX_QTY } from '@/utilities/cart'
import { CART_QUANTITY_ADD_ONE, CART_QUANTITY_LABEL, CART_QUANTITY_REMOVE_ONE } from '@/utilities/cartCopy'

const STEP_BUTTON =
  'flex size-11 shrink-0 items-center justify-center text-green-700 transition-colors hover:bg-green-50 focus-visible:ring-[3px] focus-visible:ring-green-500 focus-visible:outline-none disabled:opacity-40 disabled:hover:bg-transparent motion-reduce:transition-none'

const clamp = (value: number) => Math.min(CART_MAX_QTY, Math.max(1, value || 1))

/** The quantity box with a - and a + either side, held between 1 and the cart's cap. */
export const QuantityStepper: React.FC<{
  productTitle: string
  qty: number
  setQty: React.Dispatch<React.SetStateAction<number>>
}> = ({ productTitle, qty, setQty }) => (
  <div
    aria-label={CART_QUANTITY_LABEL}
    className="border-line rounded-pill flex items-center overflow-hidden border-2 bg-white"
    role="group"
  >
    <button
      aria-label={CART_QUANTITY_REMOVE_ONE}
      className={STEP_BUTTON}
      disabled={qty <= 1}
      onClick={() => setQty((value) => clamp(value - 1))}
      type="button"
    >
      <Minus aria-hidden="true" className="size-4" strokeWidth={2.5} />
    </button>
    <input
      aria-label={`${CART_QUANTITY_LABEL} of ${productTitle}`}
      className="text-ink-900 h-11 w-10 [appearance:textfield] bg-transparent text-center font-bold tabular-nums focus-visible:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      inputMode="numeric"
      max={CART_MAX_QTY}
      min={1}
      name="qty"
      onChange={(event) => setQty(clamp(Number(event.target.value)))}
      type="number"
      value={qty}
    />
    <button
      aria-label={CART_QUANTITY_ADD_ONE}
      className={STEP_BUTTON}
      disabled={qty >= CART_MAX_QTY}
      onClick={() => setQty((value) => clamp(value + 1))}
      type="button"
    >
      <Plus aria-hidden="true" className="size-4" strokeWidth={2.5} />
    </button>
  </div>
)
