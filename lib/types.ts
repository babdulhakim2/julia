export interface Entity {
  id: string;
  name: string;
  type: 'business' | 'property' | 'vehicle' | 'personal';
  sub: string;
  icon: string;
  color: string;
  count: number;
  info: Record<string, string>;
}

export type ItemStatus = 'due_soon' | 'overdue' | 'scheduled' | 'done' | 'needs_review' | 'drafting';

export interface Item {
  id: string;
  entity: string | null;
  category: string;
  type: string;
  title: string;
  amount?: number;
  fullAmount?: number;
  dueDate?: string;
  date?: string;
  issuer?: string;
  ref?: string;
  status: ItemStatus;
  confidence?: number;
  capturedAt?: string;
  preview?: string;
  drafted?: boolean;
  paidAt?: string;
  tags?: string[];
  folderId?: string;
}

export interface Folder {
  id: string;
  entityId: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  tags: string[];
  note: string;
  last: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface StatusMeta {
  label: string;
  color: string;
  bg: string;
}

export type StatusMetaMap = Record<ItemStatus, StatusMeta>;

// Capture types
export type CaptureStage = 'aim' | 'capturing' | 'extracting' | 'review' | 'filed';

export interface CapturedPage {
  preview: string;
  type: string;
  issuer: string;
  title: string;
  entity: string;
  confidence: number;
  fields: { k: string; v: string }[];
  action?: string;
}
