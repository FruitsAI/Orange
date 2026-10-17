export type CsvValue = number | string | null | undefined

const escapeCsvCell = (value: CsvValue) => `"${String(value ?? '').replace(/"/g, '""')}"`

export function downloadCsv(filename: string, rows: CsvValue[][]) {
  const csv = `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')}`
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
