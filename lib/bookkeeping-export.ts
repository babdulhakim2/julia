export interface BookkeepingExportRecord {
  type: 'income' | 'expense';
  paymentMethod: 'cash' | 'card' | 'bank' | 'other';
  recordDate: number;
  amount: { amountMinor: number; currency: string };
  description: string;
  category?: string;
  notes?: string;
  source?: string;
}

export type BookkeepingExportRange = 'month' | 'quarter' | 'year' | 'all';

export function filterBookkeepingRecords(
  records: BookkeepingExportRecord[],
  range: BookkeepingExportRange,
  now = new Date(),
) {
  if (range === 'all') return records;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (range === 'month') {
    start.setDate(1);
  } else if (range === 'quarter') {
    const quarterStart = Math.floor(start.getMonth() / 3) * 3;
    start.setMonth(quarterStart, 1);
  } else {
    start.setMonth(0, 1);
  }

  return records.filter(record => record.recordDate >= start.getTime());
}

export function downloadBookkeepingXls(
  entityName: string,
  records: BookkeepingExportRecord[],
  range: BookkeepingExportRange,
) {
  const filtered = filterBookkeepingRecords(records, range)
    .slice()
    .sort((a, b) => a.recordDate - b.recordDate);
  const months = groupByMonth(filtered);
  const body = Object.entries(months).map(([month, monthRecords]) => {
    const income = monthRecords
      .filter(record => record.type === 'income')
      .reduce((sum, record) => sum + record.amount.amountMinor, 0);
    const expense = monthRecords
      .filter(record => record.type === 'expense')
      .reduce((sum, record) => sum + record.amount.amountMinor, 0);
    return [
      `<h2>${escapeHtml(month)}</h2>`,
      '<table>',
      '<thead><tr><th>Date</th><th>Type</th><th>Method</th><th>Description</th><th>Category</th><th>Amount</th><th>Currency</th><th>Source</th><th>Notes</th></tr></thead>',
      '<tbody>',
      monthRecords.map(record => [
        '<tr>',
        `<td>${escapeHtml(formatDate(record.recordDate))}</td>`,
        `<td>${escapeHtml(record.type)}</td>`,
        `<td>${escapeHtml(record.paymentMethod)}</td>`,
        `<td>${escapeHtml(record.description)}</td>`,
        `<td>${escapeHtml(record.category ?? '')}</td>`,
        `<td>${(record.amount.amountMinor / 100).toFixed(2)}</td>`,
        `<td>${escapeHtml(record.amount.currency)}</td>`,
        `<td>${escapeHtml(record.source ?? '')}</td>`,
        `<td>${escapeHtml(record.notes ?? '')}</td>`,
        '</tr>',
      ].join('')).join(''),
      '</tbody>',
      `<tfoot><tr><td colspan="5">Income</td><td>${(income / 100).toFixed(2)}</td><td colspan="3"></td></tr>`,
      `<tr><td colspan="5">Expenses</td><td>${(expense / 100).toFixed(2)}</td><td colspan="3"></td></tr>`,
      `<tr><td colspan="5">Net</td><td>${((income - expense) / 100).toFixed(2)}</td><td colspan="3"></td></tr></tfoot>`,
      '</table>',
    ].join('');
  }).join('<br/>');

  const html = [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">',
    '<head><meta charset="utf-8" />',
    '<style>body{font-family:Arial,sans-serif}table{border-collapse:collapse;margin-bottom:24px}th,td{border:1px solid #ccc;padding:6px 8px;font-size:12px}th{background:#f1f3f4;text-align:left}tfoot td{font-weight:bold;background:#fafafa}h1{font-size:18px}h2{font-size:15px}</style>',
    '</head><body>',
    `<h1>${escapeHtml(entityName)} bookkeeping - ${range}</h1>`,
    body || '<p>No records for this range.</p>',
    '</body></html>',
  ].join('');

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug(entityName)}-bookkeeping-${range}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function groupByMonth(records: BookkeepingExportRecord[]) {
  return records.reduce<Record<string, BookkeepingExportRecord[]>>((groups, record) => {
    const date = new Date(record.recordDate);
    const key = date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
    groups[key] = groups[key] ?? [];
    groups[key].push(record);
    return groups;
  }, {});
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'entity';
}
