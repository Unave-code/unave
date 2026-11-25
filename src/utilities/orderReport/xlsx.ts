import ExcelJS from 'exceljs'

import { changeText, type OrderReport } from './build'
import { IST_OFFSET_MS, istFormat } from './range'

const GREEN = 'FF1A4B36'
const GREEN_TINT = 'FFE6F0EA'
const RUPEES = '"₹"#,##0.00'

/**
 * Excel stores dates without a timezone, so a cell carries the IST wall-clock
 * time: shift the instant by +5:30 and let ExcelJS write its UTC parts.
 */
const istCellDate = (at: Date) => new Date(at.getTime() + IST_OFFSET_MS)
const rupees = (paise: number) => paise / 100

const styleHeader = (row: ExcelJS.Row) => {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  row.eachCell((cell) => {
    cell.fill = { fgColor: { argb: GREEN }, pattern: 'solid', type: 'pattern' }
    cell.alignment = { vertical: 'middle' }
  })
  row.height = 20
}

const styleTotal = (row: ExcelJS.Row) => {
  row.font = { bold: true }
  row.eachCell((cell) => {
    cell.fill = { fgColor: { argb: GREEN_TINT }, pattern: 'solid', type: 'pattern' }
    cell.border = { top: { style: 'thin', color: { argb: GREEN } } }
  })
}

const table = (
  sheet: ExcelJS.Worksheet,
  columns: { header: string; key: string; width: number; numFmt?: string }[],
) => {
  sheet.columns = columns.map(({ header, key, numFmt, width }) => ({
    header,
    key,
    style: numFmt ? { numFmt } : {},
    width,
  }))
  styleHeader(sheet.getRow(1))
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
}

/**
 * The report as an .xlsx workbook: Summary, Daily, Products and Orders sheets.
 * `logo` is the green stacked lockup (public/brand/lockup-stacked-green.png),
 * placed above the title on the Summary sheet.
 */
export const renderReportXlsx = async (
  report: OrderReport,
  { logo }: { logo?: Uint8Array | null } = {},
): Promise<Buffer> => {
  const book = new ExcelJS.Workbook()
  book.creator = 'UNAVE admin'
  book.created = report.generatedAt

  const kind = report.range.period === 'week' ? 'Weekly' : 'Monthly'
  const { totals } = report

  // Summary
  const summary = book.addWorksheet('Summary')
  summary.columns = [{ width: 28 }, { width: 22 }, { width: 14 }]
  if (logo) {
    const image = book.addImage({ buffer: Buffer.from(logo) as unknown as ExcelJS.Buffer, extension: 'png' })
    for (let row = 1; row <= 5; row += 1) summary.addRow([])
    summary.addImage(image, { ext: { height: 75, width: 120 }, tl: { col: 0, row: 0.2 } })
  }
  summary.addRow([`UNAVE ${kind.toLowerCase()} orders report`]).font = {
    bold: true,
    color: { argb: GREEN },
    size: 16,
  }
  summary.addRow([report.range.label]).font = { bold: true, size: 12 }
  summary.addRow([
    `Generated ${istFormat(report.generatedAt, { dateStyle: 'medium', timeStyle: 'short' })} IST`,
  ]).font = { color: { argb: 'FF666666' }, italic: true }
  summary.addRow([])

  const figures: [string, number, string?][] = [
    ['Paid orders', totals.orders],
    ['Revenue', rupees(totals.revenue), RUPEES],
    ['Average order', rupees(totals.average), RUPEES],
    ['Items sold', totals.items],
    ['Customers', totals.customers],
    ['Razorpay fees (incl. GST)', rupees(totals.fees), RUPEES],
    ['Net after fees', rupees(totals.net), RUPEES],
  ]
  styleHeader(summary.addRow(['Figure', 'Value']))
  for (const [label, value, numFmt] of figures) {
    const row = summary.addRow([label, value])
    if (numFmt) row.getCell(2).numFmt = numFmt
  }
  const change = changeText(report)
  if (change) summary.addRow(['Compared with before', change])

  summary.addRow([])
  styleHeader(summary.addRow(['Payment method', 'Revenue', 'Orders']))
  for (const method of report.methods) {
    const row = summary.addRow([method.method, rupees(method.revenue), method.orders])
    row.getCell(2).numFmt = RUPEES
  }

  // Daily
  const daily = book.addWorksheet('Daily')
  table(daily, [
    { header: 'Date', key: 'date', numFmt: 'ddd dd mmm yyyy', width: 18 },
    { header: 'Orders', key: 'orders', width: 10 },
    { header: 'Revenue', key: 'revenue', numFmt: RUPEES, width: 16 },
  ])
  for (const day of report.days) {
    daily.addRow({ date: istCellDate(day.date), orders: day.orders, revenue: rupees(day.revenue) })
  }
  styleTotal(daily.addRow({ date: 'Total', orders: totals.orders, revenue: rupees(totals.revenue) }))

  // Products
  const products = book.addWorksheet('Products')
  table(products, [
    { header: 'Product', key: 'title', width: 40 },
    { header: 'Duration', key: 'duration', width: 14 },
    { header: 'Quantity', key: 'qty', width: 10 },
    { header: 'Orders', key: 'orders', width: 10 },
    { header: 'Revenue', key: 'revenue', numFmt: RUPEES, width: 16 },
  ])
  for (const product of report.products) {
    products.addRow({ ...product, revenue: rupees(product.revenue) })
  }
  styleTotal(
    products.addRow({ qty: totals.items, revenue: rupees(totals.revenue), title: 'Total' }),
  )

  // Orders
  const orders = book.addWorksheet('Orders')
  table(orders, [
    { header: 'Paid at (IST)', key: 'paidAt', numFmt: 'dd mmm yyyy hh:mm', width: 18 },
    { header: 'Order', key: 'id', width: 8 },
    { header: 'Customer', key: 'customer', width: 22 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'City', key: 'city', width: 14 },
    { header: 'Items', key: 'items', width: 50 },
    { header: 'Qty', key: 'qty', width: 6 },
    { header: 'Total', key: 'total', numFmt: RUPEES, width: 14 },
    { header: 'Method', key: 'method', width: 13 },
    { header: 'Razorpay payment', key: 'paymentId', width: 22 },
  ])
  for (const row of report.rows) {
    orders.addRow({ ...row, paidAt: istCellDate(row.paidAt), total: rupees(row.total) })
  }
  styleTotal(orders.addRow({ paidAt: 'Total', qty: totals.items, total: rupees(totals.revenue) }))
  orders.autoFilter = { from: 'A1', to: 'J1' }

  const buffer = await book.xlsx.writeBuffer()
  return Buffer.from(buffer as ArrayBuffer)
}
