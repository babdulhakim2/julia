'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Ic } from '@/components/icons';
import { downloadBookkeepingXls, type BookkeepingExportRange } from '@/lib/bookkeeping-export';
import { useActiveWorkspace } from '@/lib/admin-view';

interface BookkeepingPanelProps {
  entityId: string;
  entityName: string;
  compact?: boolean;
}

type RecordType = 'income' | 'expense';
type PaymentMethod = 'cash' | 'card' | 'bank' | 'other';

export function BookkeepingPanel({ entityId, entityName, compact }: BookkeepingPanelProps) {
  const { workspace, isViewingClient } = useActiveWorkspace();
  const records = useQuery(api.bookkeeping.listByEntity, {
    entityId: entityId as Id<'entities'>,
    limit: 200,
  });
  const createRecord = useMutation(api.bookkeeping.create);
  const removeRecord = useMutation(api.bookkeeping.remove);

  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<BookkeepingExportRange>('month');
  const [type, setType] = useState<RecordType>('income');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const totals = useMemo(() => {
    const list = records ?? [];
    const income = list.filter(record => record.type === 'income').reduce((sum, record) => sum + record.amount.amountMinor, 0);
    const expense = list.filter(record => record.type === 'expense').reduce((sum, record) => sum + record.amount.amountMinor, 0);
    return { income, expense, net: income - expense };
  }, [records]);

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

  const recordsList = records ?? [];

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
          }}>Excel</button>
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
        ) : recordsList.length === 0 ? (
          <div style={{ padding: 14, fontSize: 12, color: 'var(--muted)' }}>
            No bookkeeping records yet. Add takings, receipts, card settlements, or supplier costs here.
          </div>
        ) : (
          <div>
            {recordsList.slice(0, compact ? 5 : 8).map((record, index) => (
              <div key={record._id} style={{
                display: 'grid',
                gridTemplateColumns: compact ? '1fr auto' : '92px 86px 86px 1fr 88px 30px',
                gap: 8,
                alignItems: 'center',
                padding: compact ? '10px 12px' : '9px 14px',
                borderBottom: index === Math.min(recordsList.length, compact ? 5 : 8) - 1 ? 'none' : '0.5px solid var(--hair)',
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
                    </div>
                    <div style={{ fontSize: 13, color: record.type === 'income' ? 'oklch(0.45 0.13 150)' : 'oklch(0.50 0.16 25)', fontWeight: 700 }}>
                      {money(record.amount.amountMinor)}
                    </div>
                  </>
                ) : (
                  <>
                    <span style={cellStyle}>{shortDate(record.recordDate)}</span>
                    <span style={cellStyle}>{record.type}</span>
                    <span style={cellStyle}>{record.paymentMethod}</span>
                    <span style={{ ...cellStyle, color: 'var(--ink)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.description}</span>
                    <span style={{ ...cellStyle, color: record.type === 'income' ? 'oklch(0.45 0.13 150)' : 'oklch(0.50 0.16 25)', fontWeight: 700, textAlign: 'right' }}>{money(record.amount.amountMinor)}</span>
                    <button disabled={isViewingClient} onClick={() => removeRecord({ recordId: record._id })} title={isViewingClient ? 'Preview mode' : 'Delete record'} style={{
                      border: 0, background: 'transparent', cursor: 'pointer', padding: 3,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: isViewingClient ? 0.35 : 1,
                    }}>{Ic.x(14, 'var(--muted)')}</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
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

function shortDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function money(amountMinor: number) {
  const sign = amountMinor < 0 ? '-' : '';
  return `${sign}\u00a3${Math.abs(amountMinor / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
