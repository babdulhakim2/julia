import type { Item, Folder } from './types';
import { CATEGORIES } from './data';

export interface FolderSummary {
  folderId: string;
  folderName: string;
  color: string;
  isNew: boolean;
  reason: string;
  items: { id: string; title: string }[];
}

export interface AutoOrganizeResult {
  newFolders: Folder[];
  moves: { itemId: string; folderId: string }[];
  folderSummaries: FolderSummary[];
}

export function computeAutoOrganize(
  items: Item[],
  existingFolders: Folder[],
  entityId: string,
): AutoOrganizeResult {
  const existingFolderNames = new Set(existingFolders.map(f => f.name.toLowerCase()));
  const newFolders: Folder[] = [];
  const moves: { itemId: string; folderId: string }[] = [];
  const summaryMap = new Map<string, FolderSummary>();

  const groupedItems: Record<string, { label: string; color: string; reason: string; items: Item[] }> = {};
  items.forEach(it => {
    const group = inferFolderGroup(it);
    (groupedItems[group.key] = groupedItems[group.key] || {
      label: group.label,
      color: group.color,
      reason: group.reason,
      items: [],
    }).items.push(it);
  });

  const now = Date.now();
  let autoIdx = 0;

  for (const [groupKey, group] of Object.entries(groupedItems)) {
    if (group.items.length === 0) continue;

    let folder = existingFolders.find(f => normalizeName(f.name) === normalizeName(group.label));
    let isNew = false;

    if (!folder && !existingFolderNames.has(normalizeName(group.label))) {
      const newFolder: Folder = {
        id: `f-auto-${groupKey}-${now}-${autoIdx++}`,
        entityId,
        name: group.label,
        color: group.color,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      newFolders.push(newFolder);
      existingFolderNames.add(normalizeName(group.label));
      folder = newFolder;
      isNew = true;
    }

    if (folder) {
      const itemsForFolder: { id: string; title: string }[] = [];

      group.items.forEach(it => {
        // Only move items that aren't already in this folder
        if (it.folderId !== folder!.id) {
          moves.push({ itemId: it.id, folderId: folder!.id });
          itemsForFolder.push({ id: it.id, title: it.title });
        } else {
          // Already in folder — still include in summary for display
          itemsForFolder.push({ id: it.id, title: it.title });
        }
      });

      summaryMap.set(folder.id, {
        folderId: folder.id,
        folderName: folder.name,
        color: folder.color || group.color,
        isNew,
        reason: group.reason,
        items: itemsForFolder,
      });
    }
  }

  return {
    newFolders,
    moves,
    folderSummaries: Array.from(summaryMap.values()),
  };
}

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
}

function inferFolderGroup(item: Item) {
  const text = `${item.title} ${item.type} ${item.issuer ?? ''} ${(item.tags ?? []).join(' ')}`.toLowerCase();
  const category = CATEGORIES.find(c => c.id === item.category) ?? CATEGORIES[CATEGORIES.length - 1];

  const specificGroups = [
    {
      key: 'bank-statements',
      label: 'Bank statements',
      color: 'oklch(0.50 0.08 220)',
      reason: 'statement-style banking documents',
      matches: ['bank statement', 'statement', 'account confirmation', 'bank confirmation'],
    },
    {
      key: 'invoices-receipts',
      label: 'Invoices & receipts',
      color: 'oklch(0.55 0.14 150)',
      reason: 'invoices, receipts, and payment records',
      matches: ['invoice', 'receipt', 'payment request', 'bill'],
    },
    {
      key: 'tax-returns-vat',
      label: 'Tax returns & VAT',
      color: 'oklch(0.55 0.14 25)',
      reason: 'tax filings, VAT, and HMRC documents',
      matches: ['vat', 'hmrc', 'corporation tax', 'tax return', 'self assessment'],
    },
    {
      key: 'rates-council-tax',
      label: 'Rates & council tax',
      color: 'oklch(0.55 0.14 25)',
      reason: 'rates and council tax notices',
      matches: ['business rates', 'council tax', 'rates bill'],
    },
    {
      key: 'policies-insurance',
      label: 'Policies & insurance',
      color: 'oklch(0.55 0.10 240)',
      reason: 'insurance policies and renewals',
      matches: ['insurance', 'policy', 'cover note', 'renewal notice'],
    },
    {
      key: 'contracts-leases',
      label: 'Contracts & leases',
      color: 'oklch(0.55 0.10 280)',
      reason: 'contracts, leases, and legal agreements',
      matches: ['contract', 'lease', 'agreement', 'tenancy'],
    },
    {
      key: 'vehicle-compliance',
      label: 'Vehicle compliance',
      color: 'oklch(0.55 0.10 240)',
      reason: 'vehicle compliance, MOT, fines, and policy documents',
      matches: ['mot', 'vehicle', 'car', 'pcn', 'penalty charge', 'parking'],
    },
    {
      key: 'utilities',
      label: 'Utilities',
      color: 'oklch(0.62 0.14 60)',
      reason: 'utility bills and service accounts',
      matches: ['utility', 'electric', 'gas', 'water', 'broadband', 'energy'],
    },
    {
      key: 'employment-hr',
      label: 'Employment & HR',
      color: 'oklch(0.55 0.10 200)',
      reason: 'employment, payroll, and HR records',
      matches: ['employment', 'employee', 'payroll', 'paye', 'contract of employment'],
    },
  ];

  const matched = specificGroups.find(group => group.matches.some(match => text.includes(match)));
  if (matched) return matched;

  return {
    key: item.category || 'other',
    label: category?.name ?? 'Other',
    color: category?.color ?? 'oklch(0.50 0.06 300)',
    reason: `documents classified as ${category?.name ?? 'Other'}`,
  };
}
