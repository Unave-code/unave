import { PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from 'pdf-lib'

import { formatPaise } from '@/utilities/money'

import { changeText, type OrderReport } from './build'
import { istFormat } from './range'

const GREEN = rgb(0x1a / 255, 0x4b / 255, 0x36 / 255)
const GREEN_TINT = rgb(0xe6 / 255, 0xf0 / 255, 0xea / 255)
const GOLD = rgb(0xb8 / 255, 0x89 / 255, 0x2a / 255)
const INK = rgb(0.12, 0.12, 0.12)
const MUTED = rgb(0.42, 0.42, 0.42)
const RULE = rgb(0.86, 0.86, 0.86)
const WHITE = rgb(1, 1, 1)

const PAGE: [number, number] = [595.28, 841.89] // A4 portrait
const MARGIN = 40

type Align = 'left' | 'right'
type Column = { header: string; width: number; align?: Align }

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
      .map((char) => (supported.has(char.codePointAt(0) ?? 0) ? char : '?'))
      .join('')
}

const money = (paise: number) => formatPaise(paise)

/**
 * The report as an A4 PDF: summary figures, then day, product and order tables.
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
  const kind = report.range.period === 'week' ? 'Weekly' : 'Monthly'

  doc.setTitle(`UNAVE ${kind.toLowerCase()} orders report, ${safe(report.range.label)}`)
  doc.setAuthor('UNAVE')
  doc.setCreationDate(report.generatedAt)

  const contentWidth = PAGE[0] - MARGIN * 2
  let page: PDFPage = doc.addPage(PAGE)
  let y = PAGE[1] - MARGIN

  const fit = (text: string, font: PDFFont, size: number, width: number) => {
    let out = safe(text)
    if (font.widthOfTextAtSize(out, size) <= width) return out
    while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > width) out = out.slice(0, -1)
    return `${out}…`
  }

  const text = (
    value: string,
    x: number,
    at: number,
    { align = 'left', color = INK, font = regular, size = 9, width }: {
      align?: Align
      color?: ReturnType<typeof rgb>
      font?: PDFFont
      size?: number
      width?: number
    } = {},
  ) => {
    const drawn = width ? fit(value, font, size, width) : safe(value)
    const dx = align === 'right' && width ? width - font.widthOfTextAtSize(drawn, size) : 0
    page.drawText(drawn, { color, font, size, x: x + dx, y: at })
  }

  const newPage = () => {
    page = doc.addPage(PAGE)
    y = PAGE[1] - MARGIN
  }

  const ensure = (height: number) => {
    if (y - height < MARGIN + 20) newPage()
  }

  // Masthead
  page.drawRectangle({ color: GREEN, height: 64, width: PAGE[0], x: 0, y: PAGE[1] - 64 })
  if (logo) {
    const image = await doc.embedPng(logo)
    const height = 22
    const width = (image.width / image.height) * height
    page.drawImage(image, { height, width, x: MARGIN, y: PAGE[1] - 36 })
  } else {
    text('UNAVE', MARGIN, PAGE[1] - 30, { color: WHITE, font: bold, size: 18 })
  }
  text(`${kind} orders report`, MARGIN, PAGE[1] - 52, { color: WHITE, size: 9 })
  text(report.range.label, MARGIN, PAGE[1] - 30, {
    align: 'right',
    color: WHITE,
    font: bold,
    size: 13,
    width: contentWidth,
  })
  text(
    `Generated ${istFormat(report.generatedAt, { dateStyle: 'medium', timeStyle: 'short' })} IST`,
    MARGIN,
    PAGE[1] - 48,
    { align: 'right', color: WHITE, size: 8, width: contentWidth },
  )
  y = PAGE[1] - 64 - 28

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
  const cardWidth = (contentWidth - cardGap * 3) / 4
  const cardHeight = 46
  figures.forEach(([label, value], index) => {
    const col = index % 4
    const row = Math.floor(index / 4)
    const x = MARGIN + col * (cardWidth + cardGap)
    const top = y - row * (cardHeight + cardGap)
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

  const drawTable = (columns: Column[], rows: string[][], total?: string[]) => {
    const rowHeight = 16
    const scale = contentWidth / columns.reduce((sum, c) => sum + c.width, 0)
    const widths = columns.map((c) => c.width * scale)

    const drawRow = (cells: string[], options: { header?: boolean; total?: boolean }) => {
      if (options.header || options.total) {
        page.drawRectangle({
          color: options.header ? GREEN : GREEN_TINT,
          height: rowHeight,
          width: contentWidth,
          x: MARGIN,
          y: y - rowHeight + 4,
        })
      } else {
        page.drawLine({
          color: RULE,
          end: { x: MARGIN + contentWidth, y: y - rowHeight + 4 },
          start: { x: MARGIN, y: y - rowHeight + 4 },
          thickness: 0.5,
        })
      }
      let x = MARGIN
      cells.forEach((cell, index) => {
        text(cell, x + 4, y - 8, {
          align: columns[index].align,
          color: options.header ? WHITE : INK,
          font: options.header || options.total ? bold : regular,
          size: 8,
          width: widths[index] - 8,
        })
        x += widths[index]
      })
      y -= rowHeight
    }

    const header = () => drawRow(columns.map((c) => c.header), { header: true })

    ensure(rowHeight * 2)
    header()
    for (const row of rows) {
      if (y - rowHeight < MARGIN + 20) {
        newPage()
        header()
      }
      drawRow(row, {})
    }
    if (total) {
      ensure(rowHeight)
      drawRow(total, { total: true })
    }
    y -= 18
  }

  heading('Day by day')
  drawTable(
    [
      { header: 'Date', width: 3 },
      { align: 'right', header: 'Orders', width: 1 },
      { align: 'right', header: 'Revenue', width: 2 },
    ],
    report.days.map((day) => [day.label, String(day.orders), money(day.revenue)]),
    ['Total', String(totals.orders), money(totals.revenue)],
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
      ['Total', '', String(totals.items), money(totals.revenue)],
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

  heading('Orders')
  if (report.rows.length) {
    drawTable(
      [
        { header: 'Paid at', width: 1.7 },
        { header: '#', width: 0.6 },
        { header: 'Customer', width: 1.9 },
        { header: 'City', width: 1.2 },
        { header: 'Items', width: 4 },
        { header: 'Method', width: 1.1 },
        { align: 'right', header: 'Total', width: 1.3 },
      ],
      report.rows.map((row) => [
        istFormat(row.paidAt, { day: 'numeric', hour: 'numeric', minute: '2-digit', month: 'short' }),
        row.id,
        row.customer,
        row.city,
        row.items,
        row.method,
        money(row.total),
      ]),
      ['Total', '', '', '', `${totals.items} items`, '', money(totals.revenue)],
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
      x: PAGE[0] - MARGIN - regular.widthOfTextAtSize(label, 7),
      y: MARGIN / 2,
    })
    p.drawText(`UNAVE · ${safe(report.range.label)}`, { color: MUTED, font: regular, size: 7, x: MARGIN, y: MARGIN / 2 })
  })

  return doc.save()
}
