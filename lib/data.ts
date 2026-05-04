import type { Entity, Item, Category, StatusMetaMap, Folder, UsageEvent } from './types';

export const TODAY = new Date().toISOString().slice(0, 10);

export const ENTITIES_SEED: Entity[] = [];

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

export const FOLDERS_SEED: Folder[] = [];

export const USAGE_EVENTS_SEED: UsageEvent[] = [];

export const ITEMS_SEED: Item[] = [];

export const STATUS_META: StatusMetaMap = {
  due_soon:     { label: 'Due soon', color: 'oklch(0.62 0.14 60)',  bg: 'oklch(0.95 0.05 70)' },
  overdue:      { label: 'Overdue',  color: 'oklch(0.55 0.20 25)',  bg: 'oklch(0.95 0.04 25)' },
  scheduled:    { label: 'Scheduled',color: 'oklch(0.55 0.10 240)', bg: 'oklch(0.95 0.02 240)' },
  done:         { label: 'Handled',  color: 'oklch(0.50 0.12 150)', bg: 'oklch(0.95 0.04 150)' },
  needs_review: { label: 'Review',   color: 'oklch(0.50 0.06 300)', bg: 'oklch(0.95 0.02 300)' },
  drafting:     { label: 'Drafting', color: 'oklch(0.50 0.10 280)', bg: 'oklch(0.95 0.03 280)' },
};
