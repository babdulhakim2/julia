import type { Entity, Item, Contact, Category, StatusMetaMap, Folder, UsageEvent } from './types';

export const TODAY = '2026-05-02';

export const ENTITIES_SEED: Entity[] = [
  { id: 'newwok-norbury', name: 'New Wok · Norbury', type: 'business', sub: 'Restaurant · 47 Norbury Rd SW16', icon: 'building', color: 'oklch(0.62 0.13 28)', count: 14,
    info: { 'Companies House': '11245678', VAT: 'GB 392 110 04', UTR: '12345 67890', 'Premises licence': 'PL-2199' } },
  { id: 'newwok-plaistow', name: 'New Wok · Plaistow', type: 'business', sub: 'Restaurant · 11 High St E13', icon: 'building', color: 'oklch(0.62 0.13 80)', count: 8,
    info: { 'Companies House': '11245679', VAT: 'GB 392 110 04', UTR: '12345 67891' } },
  { id: 'flat-plaistow', name: '12 Plaistow Rd, Flat 2', type: 'property', sub: 'Buy-to-let · E13 0AA', icon: 'home', color: 'oklch(0.62 0.10 200)', count: 6,
    info: { 'Land Registry': 'TGL 119 220', Mortgage: 'Halifax · ends 2031' } },
  { id: 'mercedes', name: 'Mercedes LT21 ABC', type: 'vehicle', sub: 'E-Class · diesel', icon: 'car', color: 'oklch(0.55 0.10 250)', count: 4,
    info: { Reg: 'LT21 ABC', VIN: 'WDD2130412A123456', Insurance: 'Aviva · ends Aug' } },
  { id: 'personal', name: 'Personal', type: 'personal', sub: 'You & family', icon: 'user', color: 'oklch(0.62 0.06 300)', count: 3, info: {} },
];

export const CATEGORIES: Category[] = [
  { id: 'finance',     name: 'Finance',     icon: 'pound',     color: 'oklch(0.55 0.14 150)' },
  { id: 'tax',         name: 'Tax & HMRC',  icon: 'doc',       color: 'oklch(0.55 0.14 25)' },
  { id: 'utilities',   name: 'Utilities',   icon: 'bolt',      color: 'oklch(0.62 0.14 60)' },
  { id: 'legal',       name: 'Legal & Licences', icon: 'bookmark', color: 'oklch(0.55 0.10 280)' },
  { id: 'insurance',   name: 'Insurance',   icon: 'bell',      color: 'oklch(0.55 0.10 240)' },
  { id: 'fines',       name: 'Fines & PCNs', icon: 'thumbtack', color: 'oklch(0.55 0.20 25)' },
  { id: 'people',      name: 'People & HR', icon: 'contacts',  color: 'oklch(0.55 0.10 200)' },
  { id: 'operations',  name: 'Operations',  icon: 'building',  color: 'oklch(0.50 0.06 300)' },
];

export const FOLDERS_SEED: Folder[] = [
  { id: 'f1', entityId: 'newwok-norbury', name: 'Tax & HMRC', color: 'oklch(0.55 0.14 25)', createdAt: '2026-04-01' },
  { id: 'f2', entityId: 'newwok-norbury', name: 'Utilities', color: 'oklch(0.62 0.14 60)', createdAt: '2026-04-01' },
  { id: 'f3', entityId: 'newwok-norbury', name: 'Suppliers', color: 'oklch(0.55 0.14 150)', createdAt: '2026-04-01' },
];

export const USAGE_EVENTS_SEED: UsageEvent[] = [
  { id: 'u1', feature: 'document_upload', quantity: 18, unit: 'count', occurredAt: '2026-05-01T10:00:00.000Z' },
  { id: 'u2', feature: 'document_processed', quantity: 15, unit: 'count', occurredAt: '2026-05-01T10:02:00.000Z' },
  { id: 'u3', feature: 'openrouter_extract', quantity: 48200, unit: 'token', provider: 'openrouter', model: 'google/gemini-2.5-flash', occurredAt: '2026-05-01T10:03:00.000Z' },
  { id: 'u4', feature: 'openrouter_chat', quantity: 6400, unit: 'token', provider: 'openrouter', model: 'google/gemini-2.5-flash', occurredAt: '2026-05-02T09:15:00.000Z' },
  { id: 'u5', feature: 'storage_byte', quantity: 32400000, unit: 'byte', occurredAt: '2026-05-02T09:15:00.000Z' },
];

export const ITEMS_SEED: Item[] = [
  { id: 'i1', entity: 'flat-plaistow', category: 'tax', type: 'Council tax', title: 'Lambeth Council Tax — Mar instalment', amount: 214, dueDate: '2026-05-28', date: '2026-05-02', issuer: 'Lambeth Council', ref: '8821-94-23', status: 'due_soon', confidence: 0.96, capturedAt: '2026-05-02 09:14', preview: 'lambeth', tags: ['council'] },
  { id: 'i2', entity: 'mercedes', category: 'fines', type: 'PCN', title: 'Parking ticket — Streatham High Rd', amount: 65, fullAmount: 130, dueDate: '2026-05-14', date: '2026-04-30', issuer: 'Lambeth Council', ref: 'LB23994821', status: 'due_soon', confidence: 0.91, capturedAt: '2026-05-01 18:32', preview: 'pcn', drafted: true, tags: ['lambeth','appealed'] },
  { id: 'i3', entity: 'newwok-norbury', category: 'tax', type: 'Business rates', title: 'Q2 business rates demand', amount: 1840, dueDate: '2026-06-01', date: '2026-04-29', issuer: 'Croydon Council', ref: 'BR-7740-22', status: 'scheduled', confidence: 0.98, capturedAt: '2026-04-29 11:02', preview: 'rates', tags: ['rates'], folderId: 'f1' },
  { id: 'i4', entity: 'mercedes', category: 'legal', type: 'MOT', title: 'MOT renewal due', dueDate: '2026-06-12', date: '2026-04-28', issuer: 'DVSA', status: 'scheduled', confidence: 0.99, capturedAt: '2026-04-28 08:00', preview: 'mot' },
  { id: 'i5', entity: 'newwok-plaistow', category: 'utilities', type: 'Utility', title: 'British Gas — electricity Apr', amount: 482, dueDate: '2026-05-09', date: '2026-04-22', issuer: 'British Gas', ref: 'A8821934', status: 'overdue', confidence: 0.94, capturedAt: '2026-04-22 14:11', preview: 'gas', tags: ['electric'] },
  { id: 'i6', entity: 'newwok-norbury', category: 'insurance', type: 'Insurance', title: "Employer's liability renewal", amount: 612, dueDate: '2026-07-03', date: '2026-04-20', issuer: 'Hiscox', status: 'scheduled', confidence: 0.97, capturedAt: '2026-04-20 10:30', preview: 'hiscox' },
  { id: 'i7', entity: null, category: 'tax', type: 'Letter', title: 'HMRC correspondence — UTR query', issuer: 'HMRC', date: '2026-05-02', status: 'needs_review', confidence: 0.62, capturedAt: '2026-05-02 07:48', preview: 'hmrc' },
  { id: 'i8', entity: 'flat-plaistow', category: 'utilities', type: 'Utility', title: 'Thames Water — Feb', amount: 89, status: 'done', date: '2026-02-12', paidAt: '2026-04-18', issuer: 'Thames Water', confidence: 0.95, capturedAt: '2026-04-15 09:00', preview: 'gas' },
  { id: 'n1', entity: 'newwok-norbury', category: 'utilities', type: 'Utility', title: 'EDF electricity — Mar', amount: 712, status: 'done', date: '2026-03-10', paidAt: '2026-03-25', issuer: 'EDF Energy', confidence: 0.97, capturedAt: '2026-03-10 12:00', preview: 'gas', folderId: 'f2' },
  { id: 'n2', entity: 'newwok-norbury', category: 'utilities', type: 'Utility', title: 'EDF electricity — Feb', amount: 690, status: 'done', date: '2026-02-08', paidAt: '2026-02-25', issuer: 'EDF Energy', confidence: 0.97, capturedAt: '2026-02-08 09:14', preview: 'gas', folderId: 'f2' },
  { id: 'n3', entity: 'newwok-norbury', category: 'finance', type: 'Invoice', title: 'Sea Harvest — fish supplier', amount: 1240, status: 'done', date: '2026-04-12', paidAt: '2026-04-19', issuer: 'Sea Harvest Ltd', confidence: 0.96, capturedAt: '2026-04-12 10:00', preview: 'rates', folderId: 'f3' },
  { id: 'n4', entity: 'newwok-norbury', category: 'finance', type: 'Invoice', title: 'Bidfood — dry goods', amount: 880, status: 'done', date: '2026-04-05', paidAt: '2026-04-12', issuer: 'Bidfood', confidence: 0.95, capturedAt: '2026-04-05 11:00', preview: 'rates', folderId: 'f3' },
  { id: 'n5', entity: 'newwok-norbury', category: 'legal', type: 'Licence', title: 'Premises licence — annual fee', amount: 350, dueDate: '2026-08-14', date: '2026-04-01', status: 'scheduled', confidence: 0.99, issuer: 'Croydon Council', capturedAt: '2026-04-01 09:00', preview: 'mot' },
  { id: 'n6', entity: 'newwok-norbury', category: 'people', type: 'Payroll', title: 'Payslips — Apr 2026 (4 staff)', status: 'done', date: '2026-04-28', issuer: 'BrightPay', confidence: 0.99, capturedAt: '2026-04-28 17:00', preview: 'hiscox' },
  { id: 'n7', entity: 'newwok-norbury', category: 'tax', type: 'VAT', title: 'VAT return — Q1 26', amount: 4120, status: 'done', date: '2026-04-07', paidAt: '2026-04-07', issuer: 'HMRC', confidence: 0.99, capturedAt: '2026-04-07 09:00', preview: 'hmrc', folderId: 'f1' },
  { id: 'n8', entity: 'newwok-norbury', category: 'operations', type: 'Repair', title: 'Walk-in fridge repair', amount: 480, status: 'done', date: '2026-03-22', paidAt: '2026-03-22', issuer: 'CoolFix Ltd', confidence: 0.94, capturedAt: '2026-03-22 16:00', preview: 'rates' },
  { id: 'n9', entity: 'newwok-norbury', category: 'finance', type: 'Bank statement', title: 'HSBC business — Apr', status: 'done', date: '2026-05-01', issuer: 'HSBC', confidence: 0.99, capturedAt: '2026-05-01 06:00', preview: 'rates' },
  { id: 'n10', entity: 'newwok-norbury', category: 'tax', type: 'Tax', title: 'Corporation tax — final notice', amount: 8900, dueDate: '2025-12-30', date: '2025-11-28', status: 'done', paidAt: '2025-12-15', issuer: 'HMRC', confidence: 0.99, capturedAt: '2025-11-28 10:00', preview: 'hmrc', folderId: 'f1' },
];

export const CONTACTS: Contact[] = [
  { id: 'c1', name: 'John Patel', phone: '07700 900123', tags: ['regular', 'norbury'], note: 'ordered crispy duck twice, party of 4', last: '2026-04-30' },
  { id: 'c2', name: 'Marcus & Lin', phone: '07700 901442', tags: ['regular', 'plaistow'], note: 'Friday-night couple, allergic to peanuts', last: '2026-04-25' },
  { id: 'c3', name: 'Sarah Okonkwo', phone: '07700 902188', tags: ['birthday'], note: 'birthday June 12 — comp dessert', last: '2026-04-12' },
  { id: 'c4', name: 'Tom (plumber)', phone: '07911 223344', tags: ['trade', 'plaistow-flat'], note: 'fixed boiler Jan, £140', last: '2026-01-18' },
  { id: 'c5', name: 'Aman (accountant)', phone: '020 7946 0019', tags: ['admin'], note: 'quarterly VAT', last: '2026-03-30' },
];

export const STATUS_META: StatusMetaMap = {
  due_soon:     { label: 'Due soon', color: 'oklch(0.62 0.14 60)',  bg: 'oklch(0.95 0.05 70)' },
  overdue:      { label: 'Overdue',  color: 'oklch(0.55 0.20 25)',  bg: 'oklch(0.95 0.04 25)' },
  scheduled:    { label: 'Scheduled',color: 'oklch(0.55 0.10 240)', bg: 'oklch(0.95 0.02 240)' },
  done:         { label: 'Paid',     color: 'oklch(0.50 0.12 150)', bg: 'oklch(0.95 0.04 150)' },
  needs_review: { label: 'Review',   color: 'oklch(0.50 0.06 300)', bg: 'oklch(0.95 0.02 300)' },
  drafting:     { label: 'Drafting', color: 'oklch(0.50 0.10 280)', bg: 'oklch(0.95 0.03 280)' },
};
