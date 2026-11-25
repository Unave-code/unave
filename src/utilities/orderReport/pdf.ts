import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from 'pdf-lib'

import { formatPaise } from '@/utilities/money'

import { changeText, type OrderReport } from './build'
import { istFormat, periodAdjective } from './range'

const GREEN = rgb(0x1a / 255, 0x4b / 255, 0x36 / 255)
const GREEN_TINT = rgb(0xe6 / 255, 0xf0 / 255, 0xea / 255)
const ZEBRA = rgb(0.975, 0.98, 0.976)
const GOLD = rgb(0xb8 / 255, 0x89 / 255, 0x2a / 255)
const INK = rgb(0.12, 0.12, 0.12)
const MUTED = rgb(0.42, 0.42, 0.42)
const RULE = rgb(0.86, 0.86, 0.86)
const WHITE = rgb(1, 1, 1)

const PORTRAIT: [number, number] = [595.28, 841.89] // A4
const LANDSCAPE: [number, number] = [841.89, 595.28]
const MARGIN = 36
const FOOTER = 28

type Color = ReturnType<typeof rgb>
type Align = 'left' | 'right'
type Column = { header: string; width: number; align?: Align }
/** A cell is lines of text; the first can be bold, the rest muted. */
type Cell = string | { lines: string[]; strongFirst?: boolean }

/**
 * The PDF uses the standard Helvetica faces, which only carry the WinAnsi
 * character set. The rupee sign becomes "Rs" and anything else the font cannot
 * draw (a name in Tamil script, say) becomes "?", so one unusual character
 * never fails the whole download. The spreadsheet keeps every character.
 */
const makeSafe = (font: PDFFont) => {
  const supported = new Set(font.getCharacterSet())
  return (text: string) =>
    Array.from(text.replace(/₹/g, 'Rs '))
      .map((char) => (char === '\n' || supported.has(char.codePointAt(0) ?? 0) ? char : '?'))
      .join('')
}

const money = (paise: number) => formatPaise(paise)

/**
 * The report as a PDF: an A4 portrait summary (figures, days, products,
 * payment methods), then every order on landscape pages with the customer,
 * full delivery address, items and payment.
 * `logo` is the white horizontal lockup (public/brand/lockup-horizontal.png);
 * without it the masthead falls back to the word UNAVE.
 */
export const renderReportPdf = async (
  report: OrderReport,
  { logo }: { logo?: Uint8Array | null } = {},
): Promise<Uint8Array> => {
  const doc = await PDFDocument.create()
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const safe = makeSafe(regular)
  const kind = periodAdjective(report.range.period)
  const hourly = report.range.period === 'day'

  doc.setTitle(`UNAVE ${kind.toLowerCase()} orders report, ${safe(report.range.label)}`)
  doc.setAuthor('UNAVE')
  doc.setCreationDate(report.generatedAt)

  let size: [number, number] = PORTRAIT
  let page: PDFPage = doc.addPage(size)
  let y = size[1] - MARGIN
  const width = () => size[0] - MARGIN * 2

  const truncate = (value: string, font: PDFFont, fontSize: number, max: number) => {
    let out = safe(value)
    if (font.widthOfTextAtSize(out, fontSize) <= max) return out
    while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, fontSize) > max) out = out.slice(0, -1)
    return `${out}…`
  }

  /** Word-wraps text to a width; a word longer than the line is cut. */
  const wrap = (value: string, font: PDFFont, fontSize: number, max: number): string[] => {
    const out: string[] = []
    for (const paragraph of safe(value).split('\n')) {
      let line = ''
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const next = line ? `${line} ${word}` : word
        if (font.widthOfTextAtSize(next, fontSize) <= max) {
          line = next
        } else {
          if (line) out.push(line)
          line = font.widthOfTextAtSize(word, fontSize) <= max ? word : truncate(word, font, fontSize, max)
        }
      }
      out.push(line)
    }
    return out
  }

  const text = (
    value: string,
    x: number,
    at: number,
    {
      align = 'left',
      color = INK,
      font = regular,
      size: fontSize = 9,
      width: max,
    }: { align?: Align; color?: Color; font?: PDFFont; size?: number; width?: number } = {},
  ) => {
    const drawn = max ? truncate(value, font, fontSize, max) : safe(value)
    const dx = align === 'right' && max ? max - font.widthOfTextAtSize(drawn, fontSize) : 0
    page.drawText(drawn, { color, font, size: fontSize, x: x + dx, y: at })
  }

  const newPage = (next: [number, number] = size) => {
    size = next
    page = doc.addPage(size)
    y = size[1] - MARGIN
  }

  const ensure = (height: number) => {
    if (y - height < MARGIN + FOOTER) newPage()
  }

  // Masthead
  page.drawRectangle({ color: GREEN, height: 64, width: size[0], x: 0, y: size[1] - 64 })
  if (logo) {
    const image = await doc.embedPng(logo)
    const height = 22
    page.drawImage(image, {
      height,
      width: (image.width / image.height) * height,
      x: MARGIN,
      y: size[1] - 36,
    })
  } else {
    text('UNAVE', MARGIN, size[1] - 30, { color: WHITE, font: bold, size: 18 })
  }
  text(`${kind} orders report`, MARGIN, size[1] - 52, { color: WHITE, size: 9 })
  text(report.range.label, MARGIN, size[1] - 30, {
    align: 'right',
    color: WHITE,
    font: bold,
    size: 13,
    width: width(),
  })
  text(
    `Generated ${istFormat(report.generatedAt, { dateStyle: 'medium', timeStyle: 'short' })} IST`,
    MARGIN,
    size[1] - 48,
    { align: 'right', color: WHITE, size: 8, width: width() },
  )
  y = size[1] - 64 - 28

  // Figures, four to a row
  const { totals } = report
  const figures: [string, string][] = [
    ['Revenue', money(totals.revenue)],
    ['Paid orders', String(totals.orders)],
    ['Average order', money(totals.average)],
    ['Customers', String(totals.customers)],
    ['Items sold', String(totals.items)],
    ['Razorpay fees', money(totals.fees)],
    ['Net after fees', money(totals.net)],
  ]
  const cardGap = 10
  const cardWidth = (width() - cardGap * 3) / 4
  const cardHeight = 46
  figures.forEach(([label, value], index) => {
    const x = MARGIN + (index % 4) * (cardWidth + cardGap)
    const top = y - Math.floor(index / 4) * (cardHeight + cardGap)
    page.drawRectangle({ color: GREEN_TINT, height: cardHeight, width: cardWidth, x, y: top - cardHeight })
    text(label.toUpperCase(), x + 8, top - 14, { color: MUTED, size: 7 })
    text(value, x + 8, top - 34, { color: GREEN, font: bold, size: 14, width: cardWidth - 16 })
  })
  y -= 2 * cardHeight + cardGap + 16

  const change = changeText(report)
  if (change) {
    text(change, MARGIN, y, { color: GOLD, font: bold, size: 9 })
    y -= 20
  }

  const heading = (title: string) => {
    ensure(48)
    text(title, MARGIN, y, { color: GREEN, font: bold, size: 12 })
    y -= 8
    page.drawLine({ color: GOLD, end: { x: MARGIN + 36, y }, start: { x: MARGIN, y }, thickness: 1.5 })
    y -= 14
  }

  /** A table whose cells wrap; a row that does not fit moves to a new page with the header. */
  const drawTable = (
    columns: Column[],
    rows: Cell[][],
    { fontSize = 8, total, zebra = false }: { fontSize?: number; total?: Cell[]; zebra?: boolean } = {},
  ) => {
    const lineHeight = fontSize + 2.5
    const padY = 4
    const scale = width() / columns.reduce((sum, c) => sum + c.width, 0)
    const widths = columns.map((c) => c.width * scale)

    const layout = (cells: Cell[], strong: boolean) =>
      cells.map((cell, index) => {
        const max = widths[index] - 8
        if (typeof cell === 'string') {
          return wrap(cell, strong ? bold : regular, fontSize, max).map((line) => ({ line, strong, muted: false }))
        }
        return cell.lines.flatMap((value, lineIndex) => {
          const isStrong = strong || (cell.strongFirst === true && lineIndex === 0)
          const isMuted = !strong && cell.strongFirst === true && lineIndex > 0
          return value
            ? wrap(value, isStrong ? bold : regular, fontSize, max).map((line) => ({
                line,
                muted: isMuted,
                strong: isStrong,
              }))
            : []
        })
      })

    const drawRow = (cells: Cell[], kind: 'header' | 'body' | 'total', shade: boolean) => {
      const laid = layout(cells, kind !== 'body')
      const height = Math.max(1, ...laid.map((l) => l.length)) * lineHeight + padY * 2

      if (y - height < MARGIN + FOOTER) {
        newPage()
        if (kind !== 'header') drawRow(columns.map((c) => c.header), 'header', false)
      }

      const background = kind === 'header' ? GREEN : kind === 'total' ? GREEN_TINT : shade ? ZEBRA : null
      if (background) {
        page.drawRectangle({ color: background, height, width: width(), x: MARGIN, y: y - height })
      }
      if (kind === 'body') {
        page.drawLine({
          color: RULE,
          end: { x: MARGIN + width(), y: y - height },
          start: { x: MARGIN, y: y - height },
          thickness: 0.5,
        })
      }

      let x = MARGIN
      laid.forEach((cellLines, index) => {
        const max = widths[index] - 8
        cellLines.forEach(({ line, muted, strong }, lineIndex) => {
          const font = strong ? bold : regular
          const dx = columns[index].align === 'right' ? max - font.widthOfTextAtSize(line, fontSize) : 0
          page.drawText(line, {
            color: kind === 'header' ? WHITE : muted ? MUTED : INK,
            font,
            size: fontSize,
            x: x + 4 + dx,
            y: y - padY - fontSize - lineIndex * lineHeight + 1.5,
          })
        })
        x += widths[index]
      })
      y -= height
    }

    ensure(lineHeight * 3 + padY * 4)
    drawRow(columns.map((c) => c.header), 'header', false)
    rows.forEach((row, index) => drawRow(row, 'body', zebra && index % 2 === 1))
    if (total) drawRow(total, 'total', false)
    y -= 18
  }

  heading(hourly ? 'Hour by hour' : 'Day by day')
  drawTable(
    [
      { header: hourly ? 'Hour (IST)' : 'Date', width: 3 },
      { align: 'right', header: 'Orders', width: 1 },
      { align: 'right', header: 'Revenue', width: 2 },
    ],
    (hourly ? report.days.filter((slot) => slot.orders > 0) : report.days).map((day) => [
      day.label,
      String(day.orders),
      money(day.revenue),
    ]),
    { total: ['Total', String(totals.orders), money(totals.revenue)] },
  )

  heading('Products')
  if (report.products.length) {
    drawTable(
      [
        { header: 'Product', width: 5 },
        { header: 'Duration', width: 1.6 },
        { align: 'right', header: 'Qty', width: 0.8 },
        { align: 'right', header: 'Revenue', width: 1.6 },
      ],
      report.products.map((p) => [p.title, p.duration, String(p.qty), money(p.revenue)]),
      { total: ['Total', '', String(totals.items), money(totals.revenue)] },
    )
  } else {
    text('No products sold in this period.', MARGIN, y, { color: MUTED })
    y -= 24
  }

  if (report.methods.length) {
    heading('Payment methods')
    drawTable(
      [
        { header: 'Method', width: 3 },
        { align: 'right', header: 'Orders', width: 1 },
        { align: 'right', header: 'Revenue', width: 2 },
      ],
      report.methods.map((m) => [m.method, String(m.orders), money(m.revenue)]),
    )
  }

  // Orders, landscape, every field
  newPage(LANDSCAPE)
  heading(`Orders (${report.rows.length})`)
  if (report.rows.length) {
    const when = (at: Date | null) =>
      at ? istFormat(at, { day: 'numeric', hour: 'numeric', minute: '2-digit', month: 'short' }) : ''
    const day = (at: Date | null) => (at ? istFormat(at, { day: 'numeric', month: 'short', year: 'numeric' }) : '')

    drawTable(
      [
        { header: 'Order', width: 1.15 },
        { header: 'Customer', width: 2 },
        { header: 'Delivery address', width: 2.6 },
        { header: 'Items', width: 3 },
        { header: 'Payment', width: 2.3 },
        { align: 'right', header: 'Total', width: 1 },
      ],
      report.rows.map((row) => [
        {
          lines: [
            `#${row.id}`,
            when(row.paidAt),
            row.startsOn ? `Starts ${day(row.startsOn)}` : '',
          ],
          strongFirst: true,
        },
        { lines: [row.customer || 'No name', row.phone, row.email], strongFirst: true },
        {
          lines: [
            row.addressLine1,
            row.addressLine2,
            [row.city, [row.state, row.pincode].filter(Boolean).join(' ')].filter(Boolean).join(', '),
            row.foodPreference ? `Food: ${row.foodPreference}` : '',
            row.note ? `Note: ${row.note}` : '',
          ],
          strongFirst: false,
        },
        row.items.split('; ').join('\n'),
        {
          lines: [
            row.paymentDetail || row.method,
            row.paymentId,
            row.gatewayOrderId,
            row.bankReference ? `RRN ${row.bankReference}` : '',
            row.fee || row.tax ? `Fee ${money(row.fee)} + GST ${money(row.tax)}` : '',
          ],
          strongFirst: true,
        },
        money(row.total),
      ]),
      {
        total: ['Total', `${totals.customers} customers`, '', `${totals.items} items`, '', money(totals.revenue)],
        zebra: true,
      },
    )
  } else {
    text('No paid orders in this period.', MARGIN, y, { color: MUTED })
  }

  // Page numbers, once every page exists
  const pages = doc.getPages()
  pages.forEach((p, index) => {
    const label = `Page ${index + 1} of ${pages.length}`
    p.drawText(label, {
      color: MUTED,
      font: regular,
      size: 7,
      x: p.getWidth() - MARGIN - regular.widthOfTextAtSize(label, 7),
      y: MARGIN / 2,
    })
    p.drawText(`UNAVE · ${kind} orders report · ${safe(report.range.label)}`, {
      color: MUTED,
      font: regular,
      size: 7,
      x: MARGIN,
      y: MARGIN / 2,
    })
  })

  return doc.save()
}
