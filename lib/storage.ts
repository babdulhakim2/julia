import type { StoreData } from './store';

const STORE_KEY = 'secretary-store';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function loadStore(): Partial<StoreData> | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<StoreData>;
  } catch {
    return null;
  }
}

export function saveStore(data: StoreData) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded — silently fail */ }
}
