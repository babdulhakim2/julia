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
  convexDocumentId?: string;
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
  draftText?: string;
  outcomeMessage?: string;
  intakeCategory?: string;
  paidAt?: string;
  tags?: string[];
  folderId?: string;
}

export interface CalendarEventDraft {
  title: string;
  date: string;
  entityId: string | null;
  amount?: number;
  notes?: string;
}

export interface Folder {
  id: string;
  entityId: string;
  name: string;
  color?: string;
  createdAt: string;
}

export type UsageFeature =
  | 'document_upload'
  | 'document_processed'
  | 'openrouter_chat'
  | 'openrouter_extract'
  | 'openrouter_embed'
  | 'storage_byte';

export interface UsageEvent {
  id: string;
  feature: UsageFeature;
  quantity: number;
  unit: 'count' | 'token' | 'byte' | 'usd_micros';
  entityId?: string;
  provider?: string;
  model?: string;
  occurredAt: string;
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
  category?: string;
  intakeCategory?: string;
  confidence: number;
  fields: { k: string; v: string }[];
  action?: string;
}
