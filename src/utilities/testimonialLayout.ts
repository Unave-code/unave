/** What a testimonial tile is, for laying out the bento grid. */
export type TestimonialTile = 'feature' | 'long' | 'short' | 'video'

/**
 * How many columns each testimonial tile spans on a grid of `columns`.
 *
 * Every row is planned so its tiles add up to the full width: a tile that would
 * not fit what is left of a row shrinks to fit it (a quote), or the row closes
 * by widening its last quote; the last row closes the same way. A two-row tile
 * (a video on three columns, or a tall feature) holds its columns in the next
 * row too. So the grid never leaves an empty column or ends on a hole,
 * whatever mix of quotes and videos the kitchen adds.
 */
export const planTestimonialWidths = (
  tiles: TestimonialTile[],
  columns: 2 | 3,
  tallFeature = false,
): number[] => {
  const widths = tiles.map(() => 1)
  let row: number[] = []
  let rowLeft: number = columns
  let nextCarry = 0

  const widenRow = () => {
    const target = [...row].reverse().find((i) => tiles[i] !== 'video')
    if (target !== undefined && rowLeft > 0) widths[target] += rowLeft
  }
  const newRow = () => {
    row = []
    rowLeft = columns - nextCarry
    nextCarry = 0
    if (rowLeft <= 0) rowLeft = columns
  }

  tiles.forEach((tile, index) => {
    const isVideo = tile === 'video'
    const isFeature = tile === 'feature'
    const tall = columns === 3 && (isVideo || (isFeature && tallFeature))
    let want = Math.min(columns, isFeature || tile === 'long' ? 2 : 1)

    if (want > rowLeft) {
      if (!isVideo && !isFeature) {
        want = rowLeft
      } else {
        widenRow()
        newRow()
      }
    }

    widths[index] = want
    row.push(index)
    rowLeft -= want
    if (tall) nextCarry += want
    if (rowLeft === 0) newRow()
  })

  if (rowLeft > 0 && rowLeft < columns) widenRow()

  return widths
}
