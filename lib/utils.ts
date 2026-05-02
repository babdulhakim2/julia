import { TODAY } from './data';

export function cn(...args: (string | false | null | undefined)[]): string {
  return args.filter(Boolean).join(' ');
}

export function fmtDate(d: string | undefined | null): string | null {
  if (!d) return null;
  const date = new Date(d);
  const today = new Date(TODAY);
  const days = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 0 && days < 7) return `in ${days} days`;
  if (days < 0 && days > -7) return `${-days}d overdue`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function fmtCurrency(n: number): string {
  return `£${n.toLocaleString()}`;
}

export function inPeriod(date: string | undefined, period: string): boolean {
  if (period === 'all' || !date) return period === 'all';
  if (period.length === 4) return date.startsWith(period);
  if (period.includes('Q')) {
    const [y, q] = period.split('-Q');
    const m = parseInt(date.slice(5, 7), 10);
    const qi = Math.ceil(m / 3);
    return date.startsWith(y) && qi === parseInt(q, 10);
  }
  return date.startsWith(period);
}

export function getInitials(name: string): string {
  return name.split(' ').map(s => s[0]).slice(0, 2).join('');
}

export function dRel(d: string | undefined): string {
  if (!d) return '';
  const today = new Date(TODAY);
  const date = new Date(d);
  const days = Math.round((date.getTime() - today.getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 0 && days < 7) return `In ${days} days`;
  if (days < 0) return `${Math.abs(days)}d overdue`;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function inDateRange(date: string | undefined, start: string, end: string): boolean {
  if (!date) return false;
  return date >= start && date <= end;
}
