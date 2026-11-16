import { describe, expect, it } from 'vitest'

import { planTestimonialWidths, type TestimonialTile } from '@/utilities/testimonialLayout'

/**
 * The testimonial bento grid's row planner: every row adds up to the full
 * width, so no column is left empty and the grid never ends on a hole.
 */

/** Sum the widths row by row, treating two-row tiles as holding the next row. */
const rowsFull = (tiles: TestimonialTile[], widths: number[], columns: number, tall = false) => {
  let left = columns
  let carry = 0
  for (let i = 0; i < tiles.length; i += 1) {
    if (left <= 0) {
      left = columns - carry || columns
      carry = 0
    }
    left -= widths[i]
    if (left < 0) return false
    if (columns === 3 && (tiles[i] === 'video' || (tiles[i] === 'feature' && tall))) carry += widths[i]
  }
  return left === 0
}

describe('the testimonial bento planner', () => {
  it('fills both rows for a feature and two long quotes (no empty third column)', () => {
    const tiles: TestimonialTile[] = ['feature', 'long', 'long']
    const widths = planTestimonialWidths(tiles, 3)

    expect(widths).toEqual([2, 1, 3])
    expect(rowsFull(tiles, widths, 3)).toBe(true)
  })

  it('packs a quote under the feature beside a tall video', () => {
    const tiles: TestimonialTile[] = ['feature', 'video', 'short']
    expect(planTestimonialWidths(tiles, 3)).toEqual([2, 1, 2])
  })

  it('lets a lone feature stand beside a video', () => {
    expect(planTestimonialWidths(['feature', 'video'], 3, true)).toEqual([2, 1])
  })

  it('closes every row for a range of mixes, on two and three columns', () => {
    const mixes: TestimonialTile[][] = [
      ['feature'],
      ['feature', 'short'],
      ['feature', 'short', 'short'],
      ['feature', 'short', 'short', 'short'],
      ['feature', 'long', 'short', 'long', 'short'],
      ['feature', 'short', 'long', 'long', 'short', 'short'],
    ]

    for (const tiles of mixes) {
      expect(rowsFull(tiles, planTestimonialWidths(tiles, 3), 3)).toBe(true)
      expect(rowsFull(tiles, planTestimonialWidths(tiles, 2), 2)).toBe(true)
    }
  })
})
