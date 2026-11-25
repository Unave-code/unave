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
 * The report as an .xlsx workbook: Summary, Daily, Products, Orders (every
 * field of every order) and Order lines (one row per product) sheets.
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

  // Orders: one row per order, every field the order holds
  const orders = book.addWorksheet('Orders')
  const DATE_TIME = 'dd mmm yyyy hh:mm'
  table(orders, [
    { header: 'Paid at (IST)', key: 'paidAt', numFmt: DATE_TIME, width: 18 },
    { header: 'Order', key: 'id', width: 8 },
    { header: 'Customer', key: 'customer', width: 22 },
    { header: 'Email', key: 'email', width: 28 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Address line 1', key: 'addressLine1', width: 30 },
    { header: 'Address line 2', key: 'addressLine2', width: 24 },
    { header: 'City', key: 'city', width: 14 },
    { header: 'State', key: 'state', width: 14 },
    { header: 'Pincode', key: 'pincode', width: 10 },
    { header: 'Food preference', key: 'foodPreference', width: 16 },
    { header: 'Delivery note', key: 'note', width: 30 },
    { header: 'Items', key: 'items', width: 50 },
    { header: 'Qty', key: 'qty', width: 6 },
    { header: 'Subtotal', key: 'subtotal', numFmt: RUPEES, width: 13 },
    { header: 'Total', key: 'total', numFmt: RUPEES, width: 13 },
    { header: 'Deliveries start', key: 'startsOn', numFmt: 'dd mmm yyyy', width: 15 },
    { header: 'Method', key: 'method', width: 13 },
    { header: 'Paid with', key: 'paymentDetail', width: 26 },
    { header: 'Bank reference (RRN)', key: 'bankReference', width: 20 },
    { header: 'Razorpay fee', key: 'fee', numFmt: RUPEES, width: 13 },
    { header: 'GST on fee', key: 'tax', numFmt: RUPEES, width: 12 },
    { header: 'Payer email', key: 'payerEmail', width: 26 },
    { header: 'Payer phone', key: 'payerPhone', width: 15 },
    { header: 'Captured at (IST)', key: 'capturedAt', numFmt: DATE_TIME, width: 18 },
    { header: 'Razorpay order', key: 'gatewayOrderId', width: 22 },
    { header: 'Razorpay payment', key: 'paymentId', width: 22 },
    { header: 'Created at (IST)', key: 'createdAt', numFmt: DATE_TIME, width: 18 },
  ])
  for (const row of report.rows) {
    orders.addRow({
      ...row,
      capturedAt: row.capturedAt ? istCellDate(row.capturedAt) : null,
      createdAt: row.createdAt ? istCellDate(row.createdAt) : null,
      fee: rupees(row.fee),
      paidAt: istCellDate(row.paidAt),
      startsOn: row.startsOn ? istCellDate(row.startsOn) : null,
      subtotal: rupees(row.subtotal),
      tax: rupees(row.tax),
      total: rupees(row.total),
    })
  }
  styleTotal(
    orders.addRow({
      fee: rupees(report.rows.reduce((sum, row) => sum + row.fee, 0)),
      paidAt: 'Total',
      qty: totals.items,
      subtotal: rupees(report.rows.reduce((sum, row) => sum + row.subtotal, 0)),
      tax: rupees(report.rows.reduce((sum, row) => sum + row.tax, 0)),
      total: rupees(totals.revenue),
    }),
  )
  orders.autoFilter = { from: { column: 1, row: 1 }, to: { column: orders.columnCount, row: 1 } }
  orders.views = [{ state: 'frozen', xSplit: 3, ySplit: 1 }]

  // Order lines: one row per product in each order
  const lines = book.addWorksheet('Order lines')
  table(lines, [
    { header: 'Paid at (IST)', key: 'paidAt', numFmt: DATE_TIME, width: 18 },
    { header: 'Order', key: 'orderId', width: 8 },
    { header: 'Customer', key: 'customer', width: 22 },
    { header: 'Product', key: 'product', width: 32 },
    { header: 'Duration', key: 'duration', width: 12 },
    { header: 'Days', key: 'days', width: 7 },
    { header: 'Qty', key: 'qty', width: 6 },
    { header: 'Product price', key: 'basePrice', numFmt: RUPEES, width: 14 },
    { header: 'Add-ons', key: 'addons', width: 28 },
    { header: 'Add-ons price', key: 'addonsPrice', numFmt: RUPEES, width: 14 },
    { header: 'Unit price', key: 'unitPrice', numFmt: RUPEES, width: 13 },
    { header: 'Line total', key: 'lineTotal', numFmt: RUPEES, width: 13 },
    { header: 'Combo contents', key: 'contents', width: 40 },
  ])
  for (const line of report.lines) {
    lines.addRow({
      ...line,
      addonsPrice: line.addonsPrice ? rupees(line.addonsPrice) : null,
      basePrice: line.basePrice === null ? null : rupees(line.basePrice),
      lineTotal: rupees(line.lineTotal),
      paidAt: istCellDate(line.paidAt),
      unitPrice: rupees(line.unitPrice),
    })
  }
  styleTotal(
    lines.addRow({
      lineTotal: rupees(report.lines.reduce((sum, line) => sum + line.lineTotal, 0)),
      paidAt: 'Total',
      qty: totals.items,
    }),
  )
  lines.autoFilter = { from: { column: 1, row: 1 }, to: { column: lines.columnCount, row: 1 } }

  const buffer = await book.xlsx.writeBuffer()
  return Buffer.from(buffer as ArrayBuffer)
}
