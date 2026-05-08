'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { Ic } from '@/components/icons';
import { downloadBookkeepingXls, type BookkeepingExportRange } from '@/lib/bookkeeping-export';
import { useActiveWorkspace } from '@/lib/admin-view';
import { DocumentPreviewModal } from '@/components/shared/document-preview-modal';

interface BookkeepingPanelProps {
  entityId: string;
  entityName: string;
  compact?: boolean;
}

type RecordType = 'income' | 'expense';
type PaymentMethod = 'cash' | 'card' | 'bank' | 'other';

export function BookkeepingPanel({ entityId, entityName, compact }: BookkeepingPanelProps) {
  const { workspace, isViewingClient } = useActiveWorkspace();
  const [range, setRange] = useState<BookkeepingExportRange>('month');
  const recordRange = useMemo(() => bookkeepingRangeBounds(range), [range]);
  const records = useQuery(api.bookkeeping.listByEntity, {
    entityId: entityId as Id<'entities'>,
    from: recordRange.from,
    to: recordRange.to,
    limit: 200,
  });
  const createRecord = useMutation(api.bookkeeping.create);
  const updateRecord = useMutation(api.bookkeeping.update);
  const removeRecord = useMutation(api.bookkeeping.remove);
  const deleteDocument = useMutation(api.documents.remove);

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<RecordType>('income');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null);
  const [deleteRecordId, setDeleteRecordId] = useState<Id<'bookkeepingRecords'> | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<Id<'bookkeepingRecords'> | null>(null);
  const [editType, setEditType] = useState<RecordType>('income');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('card');
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const recordsList = useMemo(() => records ?? [], [records]);
  const visibleRecords = recordsList;

  const totals = useMemo(() => {
    const income = visibleRecords.filter(record => record.type === 'income').reduce((sum, record) => sum + record.amount.amountMinor, 0);
    const expense = visibleRecords.filter(record => record.type === 'expense').reduce((sum, record) => sum + record.amount.amountMinor, 0);
    return { income, expense, net: income - expense };
  }, [visibleRecords]);

  async function saveRecord() {
    if (!workspace || !amount || !description.trim() || saving) return;
    const amountMinor = Math.round(Number(amount) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) return;

    setSaving(true);
    try {
      await createRecord({
        workspaceId: workspace._id,
        entityId: entityId as Id<'entities'>,
        type,
        paymentMethod,
        recordDate: dateToTimestamp(date),
        amount: { amountMinor, currency: 'GBP' },
        description: description.trim(),
        category: category.trim() || undefined,
      });
      setAmount('');
      setDescription('');
      setCategory('');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteRecord() {
    if (!deleteRecordId || deleting) return;
    const target = recordsList.find(record => record._id === deleteRecordId);
    setDeleting(true);
    try {
      if (target?.documentId) {
        if (previewDocumentId === target.documentId) {
          setPreviewDocumentId(null);
        }
        await deleteDocument({ documentId: target.documentId });
      } else {
        await removeRecord({ recordId: deleteRecordId });
      }
      setDeleteRecordId(null);
    } finally {
      setDeleting(false);
    }
  }

  function startEditRecord(record: Doc<'bookkeepingRecords'>) {
    setEditingRecordId(record._id);
    setEditType(record.type);
    setEditPaymentMethod(record.paymentMethod);
    setEditDate(inputDate(record.recordDate));
    setEditAmount(String(record.amount.amountMinor / 100));
    setEditDescription(record.description);
    setEditCategory(record.category ?? '');
  }

  async function saveEditRecord() {
    if (!editingRecordId || editSaving || isViewingClient) return;
    const amountMinor = Math.round(Number(editAmount) * 100);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0 || !editDescription.trim()) return;

    setEditSaving(true);
    try {
      await updateRecord({
        recordId: editingRecordId,
        type: editType,
        paymentMethod: editPaymentMethod,
        recordDate: dateToTimestamp(editDate),
        amount: { amountMinor, currency: 'GBP' },
        description: editDescription.trim(),
        category: editCategory.trim() || undefined,
      });
      setEditingRecordId(null);
    } finally {
      setEditSaving(false);
    }
  }

  const rowLimit = expanded ? visibleRecords.length : compact ? 5 : 8;
  const deleteRecord = deleteRecordId
    ? recordsList.find(record => record._id === deleteRecordId)
    : null;

  return (
    <section style={{
      padding: compact ? '12px 16px 0' : '14px 24px 0',
    }}>
      <div style={{
        border: '0.5px solid var(--sep)',
        borderRadius: 10,
        background: '#FAF9F5',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: compact ? '12px 12px' : '12px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '0.5px solid var(--hair)',
        }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--ink)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {Ic.pound(15, '#fff')}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: compact ? 14 : 13.5, color: 'var(--ink)', fontWeight: 700 }}>Bookkeeping</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
              Income {money(totals.income)} · Expenses {money(totals.expense)} · Net {money(totals.net)}
            </div>
          </div>
          <select value={range} onChange={event => setRange(event.target.value as BookkeepingExportRange)} style={{
            border: '0.5px solid var(--sep)', borderRadius: 7, background: '#fff',
            padding: '6px 7px', fontSize: 12, fontFamily: 'var(--font)', color: 'var(--ink)',
          }}>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Year</option>
            <option value="all">All</option>
          </select>
          <button onClick={() => downloadBookkeepingXls(entityName, recordsList, range)} style={{
            border: 0, borderRadius: 7, background: '#fff', color: 'var(--accent)',
            padding: '7px 9px', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)',
          }}>Export</button>
          <button disabled={isViewingClient} onClick={() => setOpen(value => !value)} style={{
            border: 0, borderRadius: 7, background: 'var(--ink)', color: '#fff',
            padding: '7px 9px', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)',
            opacity: isViewingClient ? 0.45 : 1,
          }}>{open ? 'Close' : 'Add'}</button>
        </div>

        {open && (
          <div style={{
            padding: compact ? 12 : 14,
            display: 'grid',
            gridTemplateColumns: compact ? '1fr' : '0.8fr 0.8fr 0.8fr 0.8fr 1.4fr 1fr auto',
            gap: 8,
            borderBottom: '0.5px solid var(--hair)',
          }}>
            <select value={type} onChange={event => setType(event.target.value as RecordType)} style={inputStyle}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value as PaymentMethod)} style={inputStyle}>
              <option value="card">Card</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="other">Other</option>
            </select>
            <input type="date" value={date} onChange={event => setDate(event.target.value)} style={inputStyle} />
            <input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Amount" style={inputStyle} />
            <input value={description} onChange={event => setDescription(event.target.value)} placeholder="Description" style={inputStyle} />
            <input value={category} onChange={event => setCategory(event.target.value)} placeholder="Category" style={inputStyle} />
            <button onClick={saveRecord} disabled={saving || !amount || !description.trim()} style={{
              border: 0, borderRadius: 7, background: 'var(--ink)', color: '#fff',
              padding: '8px 12px', cursor: saving ? 'default' : 'pointer',
              opacity: saving || !amount || !description.trim() ? 0.5 : 1,
              fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)',
            }}>{saving ? 'Saving' : 'Save'}</button>
          </div>
        )}

        {records === undefined ? (
          <div style={{ padding: 14, fontSize: 12, color: 'var(--muted)' }}>Loading records...</div>
        ) : visibleRecords.length === 0 ? (
          <div style={{ padding: 14, fontSize: 12, color: 'var(--muted)' }}>
            No bookkeeping records for this period. Add takings, receipts, card settlements, or supplier costs here.
          </div>
        ) : (
          <div>
            {visibleRecords.slice(0, rowLimit).map((record, index) => (
              <React.Fragment key={record._id}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: compact ? '1fr auto' : '92px 86px 86px 1fr 88px 76px 62px',
                  gap: 8,
                  alignItems: 'center',
                  padding: compact ? '10px 12px' : '9px 14px',
                  borderBottom: editingRecordId === record._id ? 'none' : index === Math.min(visibleRecords.length, rowLimit) - 1 && visibleRecords.length <= rowLimit ? 'none' : '0.5px solid var(--hair)',
                }}>
                  {compact ? (
                    <>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {record.description}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                          {shortDate(record.recordDate)} · {record.type} · {record.paymentMethod}
                        </div>
                        {record.documentId && (
                          <button onClick={() => setPreviewDocumentId(record.documentId ?? null)} style={{
                            marginTop: 5, border: 0, background: 'transparent', padding: 0,
                            color: 'var(--accent)', fontSize: 11, fontWeight: 700,
                            fontFamily: 'var(--font)', cursor: 'pointer',
                          }}>via document</button>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <div style={{ fontSize: 13, color: record.type === 'income' ? 'oklch(0.45 0.13 150)' : 'oklch(0.50 0.16 25)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                          {money(record.amount.amountMinor)}
                        </div>
                        <IconButton disabled={isViewingClient} title={isViewingClient ? 'Preview mode' : 'Edit entry'} onClick={() => startEditRecord(record)}>
                          {Ic.edit(13, 'var(--accent)')}
                        </IconButton>
                        <IconButton disabled={isViewingClient} title={isViewingClient ? 'Preview mode' : 'Delete entry'} onClick={() => setDeleteRecordId(record._id)}>
                          {Ic.x(13, 'var(--muted)')}
                        </IconButton>
                      </div>
                    </>
                  ) : (
                    <>
                      <span style={cellStyle}>{shortDate(record.recordDate)}</span>
                      <span style={cellStyle}>{record.type}</span>
                      <span style={cellStyle}>{record.paymentMethod}</span>
                      <span style={{ ...cellStyle, color: 'var(--ink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.description}</span>
                      <span style={{ ...cellStyle, color: record.type === 'income' ? 'oklch(0.45 0.13 150)' : 'oklch(0.50 0.16 25)', fontWeight: 700, textAlign: 'right' }}>{money(record.amount.amountMinor)}</span>
                      {record.documentId ? (
                        <button onClick={() => setPreviewDocumentId(record.documentId ?? null)} style={{
                          border: 0, background: 'transparent', color: 'var(--accent)',
                          fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--font)',
                          cursor: 'pointer', textAlign: 'left', padding: 0,
                        }}>document</button>
                      ) : (
                        <span style={{ ...cellStyle, color: 'var(--muted2)' }}>manual</span>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                        <button disabled={isViewingClient} onClick={() => startEditRecord(record)} title={isViewingClient ? 'Preview mode' : 'Edit entry'} style={{
                          border: 0, background: 'transparent', cursor: 'pointer', padding: 3,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: isViewingClient ? 0.35 : 1,
                        }}>{Ic.edit(14, 'var(--accent)')}</button>
                        <button disabled={isViewingClient} onClick={() => setDeleteRecordId(record._id)} title={isViewingClient ? 'Preview mode' : 'Delete entry'} style={{
                          border: 0, background: 'transparent', cursor: 'pointer', padding: 3,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          opacity: isViewingClient ? 0.35 : 1,
                        }}>{Ic.x(14, 'var(--muted)')}</button>
                      </div>
                    </>
                  )}
                </div>
                {editingRecordId === record._id && (
                  <EditRecordForm
                    compact={compact}
                    type={editType}
                    paymentMethod={editPaymentMethod}
                    date={editDate}
                    amount={editAmount}
                    description={editDescription}
                    category={editCategory}
                    saving={editSaving}
                    onType={setEditType}
                    onPaymentMethod={setEditPaymentMethod}
                    onDate={setEditDate}
                    onAmount={setEditAmount}
                    onDescription={setEditDescription}
                    onCategory={setEditCategory}
                    onSave={saveEditRecord}
                    onCancel={() => setEditingRecordId(null)}
                  />
                )}
              </React.Fragment>
            ))}
            {visibleRecords.length > rowLimit && (
              <button onClick={() => setExpanded(true)} style={{
                width: '100%', border: 0, borderTop: '0.5px solid var(--hair)',
                background: '#fff', color: 'var(--accent)',
                padding: compact ? '11px 12px' : '10px 14px',
                fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font)',
                cursor: 'pointer',
              }}>
                See {visibleRecords.length - rowLimit} more
              </button>
            )}
            {expanded && visibleRecords.length > (compact ? 5 : 8) && (
              <button onClick={() => setExpanded(false)} style={{
                width: '100%', border: 0, borderTop: '0.5px solid var(--hair)',
                background: '#fff', color: 'var(--muted)',
                padding: compact ? '11px 12px' : '10px 14px',
                fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font)',
                cursor: 'pointer',
              }}>
                Show fewer
              </button>
            )}
          </div>
        )}
      </div>
      {previewDocumentId && (
        <DocumentPreviewModal
          documentId={previewDocumentId}
          onClose={() => setPreviewDocumentId(null)}
        />
      )}
      {deleteRecordId && (
        <ConfirmDeleteDialog
          description={deleteRecord?.description}
          hasDocument={Boolean(deleteRecord?.documentId)}
          deleting={deleting}
          onCancel={() => {
            if (!deleting) setDeleteRecordId(null);
          }}
          onConfirm={confirmDeleteRecord}
        />
      )}
    </section>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '0.5px solid var(--sep)',
  borderRadius: 7,
  background: '#fff',
  padding: '8px 9px',
  fontSize: 13,
  fontFamily: 'var(--font)',
  color: 'var(--ink)',
  outline: 'none',
};

const cellStyle: React.CSSProperties = {
  fontSize: 12,
  color: 'var(--muted)',
};

function dateToTimestamp(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day, 12);
  return Number.isFinite(timestamp) ? timestamp : Date.now();
}

function inputDate(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function shortDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function money(amountMinor: number) {
  const sign = amountMinor < 0 ? '-' : '';
  return `${sign}\u00a3${Math.abs(amountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function bookkeepingRangeBounds(range: BookkeepingExportRange, now = new Date()) {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  if (range === 'all') return { from: undefined, to: end.getTime() };
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === 'month') {
    start.setDate(1);
  } else if (range === 'quarter') {
    start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
  } else {
    start.setMonth(0, 1);
  }
  return { from: start.getTime(), to: end.getTime() };
}

function IconButton({
  children,
  disabled,
  title,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button disabled={disabled} onClick={onClick} title={title} style={{
      width: 28, height: 28, borderRadius: 14,
      border: '0.5px solid var(--hair)', background: '#fff',
      cursor: disabled ? 'default' : 'pointer', padding: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: disabled ? 0.35 : 1,
    }}>
      {children}
    </button>
  );
}

function EditRecordForm({
  compact,
  type,
  paymentMethod,
  date,
  amount,
  description,
  category,
  saving,
  onType,
  onPaymentMethod,
  onDate,
  onAmount,
  onDescription,
  onCategory,
  onSave,
  onCancel,
}: {
  compact?: boolean;
  type: RecordType;
  paymentMethod: PaymentMethod;
  date: string;
  amount: string;
  description: string;
  category: string;
  saving: boolean;
  onType: (value: RecordType) => void;
  onPaymentMethod: (value: PaymentMethod) => void;
  onDate: (value: string) => void;
  onAmount: (value: string) => void;
  onDescription: (value: string) => void;
  onCategory: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{
      padding: compact ? '0 12px 12px' : '0 14px 14px',
      borderBottom: '0.5px solid var(--hair)',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr 1fr' : '0.8fr 0.8fr 0.9fr 0.9fr 1.5fr 1fr auto auto',
        gap: 8,
        padding: compact ? 10 : 12,
        borderRadius: 10,
        border: '0.5px solid var(--sep)',
        background: '#fff',
      }}>
        <select value={type} onChange={event => onType(event.target.value as RecordType)} style={inputStyle}>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select value={paymentMethod} onChange={event => onPaymentMethod(event.target.value as PaymentMethod)} style={inputStyle}>
          <option value="card">Card</option>
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="other">Other</option>
        </select>
        <input type="date" value={date} onChange={event => onDate(event.target.value)} style={inputStyle} />
        <input inputMode="decimal" value={amount} onChange={event => onAmount(event.target.value)} placeholder="Amount" style={inputStyle} />
        <input value={description} onChange={event => onDescription(event.target.value)} placeholder="Description" style={{ ...inputStyle, gridColumn: compact ? '1 / -1' : undefined }} />
        <input value={category} onChange={event => onCategory(event.target.value)} placeholder="Category" style={inputStyle} />
        <button onClick={onCancel} disabled={saving} style={{
          border: '0.5px solid var(--sep)', borderRadius: 7, background: '#fff', color: 'var(--ink)',
          padding: '8px 12px', cursor: saving ? 'default' : 'pointer',
          fontSize: 12, fontWeight: 800, fontFamily: 'var(--font)',
        }}>Cancel</button>
        <button onClick={onSave} disabled={saving || !amount || !description.trim()} style={{
          border: 0, borderRadius: 7, background: 'var(--ink)', color: '#fff',
          padding: '8px 12px', cursor: saving ? 'default' : 'pointer',
          opacity: saving || !amount || !description.trim() ? 0.5 : 1,
          fontSize: 12, fontWeight: 800, fontFamily: 'var(--font)',
        }}>{saving ? 'Saving' : 'Save'}</button>
      </div>
    </div>
  );
}

function ConfirmDeleteDialog({
  description,
  hasDocument,
  deleting,
  onCancel,
  onConfirm,
}: {
  description?: string;
  hasDocument?: boolean;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, zIndex: 120,
      background: 'rgba(0,0,0,0.34)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 18,
    }}>
      <div onClick={event => event.stopPropagation()} style={{
        width: 'min(360px, 100%)',
        borderRadius: 14,
        background: '#fff',
        boxShadow: '0 24px 70px rgba(0,0,0,0.24)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 18px 12px' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>
            Delete this entry?
          </div>
          <div style={{ marginTop: 7, fontSize: 13, color: 'var(--muted)', lineHeight: 1.45 }}>
            {description ? `"${description}" will be removed from the books.` : 'This entry will be removed from the books.'}
            {hasDocument
              ? ' The source document, uploaded files, reminders, calendar items, and search index will also be removed.'
              : ' This manual entry has no source document.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, padding: '0 18px 18px' }}>
          <button onClick={onCancel} disabled={deleting} style={{
            flex: 1, border: '0.5px solid var(--sep)', borderRadius: 9,
            background: '#fff', color: 'var(--ink)', padding: '10px 12px',
            fontSize: 13, fontWeight: 800, fontFamily: 'var(--font)',
            cursor: deleting ? 'default' : 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} disabled={deleting} style={{
            flex: 1, border: 0, borderRadius: 9,
            background: 'oklch(0.50 0.16 25)', color: '#fff',
            padding: '10px 12px', fontSize: 13, fontWeight: 800,
            fontFamily: 'var(--font)', cursor: deleting ? 'default' : 'pointer',
            opacity: deleting ? 0.65 : 1,
          }}>
            {deleting ? 'Deleting' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
