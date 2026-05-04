'use client';

import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useStore } from '@/lib/store';
import type { Entity, Item, ItemStatus } from '@/lib/types';
import { DesktopSidebar } from '@/components/desktop/sidebar';
import { DesktopInspector } from '@/components/desktop/inspector';
import { TabBar } from '@/components/mobile/tab-bar';
import { DesktopUploadModal } from '@/components/desktop/upload-modal';
import { CaptureFlow } from '@/components/mobile/capture/capture-flow';
import { Toast } from '@/components/ui/toast';
import { ClientRedirect } from '@/components/ui/client-redirect';

const SELECTED_ITEM_KEY = 'julia-selected-item';

function loadSelectedItemId() {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(SELECTED_ITEM_KEY) || '';
  } catch {
    return '';
  }
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useConvexAuth();
  const { dispatch } = useStore();
  const storeUser = useMutation(api.users.store);
  const userSynced = useRef(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [filedToast, setFiledToast] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState(loadSelectedItemId);

  // Convex-backed onboarding gate
  const me = useQuery(api.users.getMe);
  const workspace = useQuery(api.workspaces.getMyWorkspace);
  const entities = useQuery(
    api.entities.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip",
  );
  const documents = useQuery(
    api.documents.listByWorkspace,
    workspace ? { workspaceId: workspace._id } : "skip",
  );

  // Sync Clerk identity → Convex users table
  useEffect(() => {
    if (isAuthenticated && !userSynced.current) {
      userSynced.current = true;
      storeUser().catch(() => {
        userSynced.current = false;
      });
    }
  }, [isAuthenticated, storeUser]);

  // Sync Convex entities → localStorage store for backward compatibility
  useEffect(() => {
    if (!entities) return;
    const mapped: Entity[] = entities.map(e => ({
      id: e._id,
      name: e.name,
      type: e.kind,
      sub: e.subtitle ?? '',
      icon: e.icon,
      color: e.color,
      count: 0,
      info: e.identifiers,
    }));
    dispatch({ type: 'SET_ENTITIES', entities: mapped });
  }, [entities, dispatch]);

  useEffect(() => {
    if (!documents) return;
    const mapped: Item[] = documents.map(doc => ({
      id: `doc-${doc._id}`,
      convexDocumentId: doc._id,
      entity: doc.entityId ?? null,
      category: doc.category,
      type: doc.documentType,
      title: doc.title,
      amount: doc.amount ? Math.round(doc.amount.amountMinor / 100) : undefined,
      dueDate: doc.dueAt ? dateFromTimestamp(doc.dueAt) : undefined,
      date: dateFromTimestamp(doc.issuedAt ?? doc.capturedAt ?? doc.createdAt),
      issuer: doc.issuer,
      ref: doc.reference,
      status: itemStatusFromDocument(doc.status),
      confidence: doc.confidence,
      capturedAt: timestampLabel(doc.capturedAt),
      preview: doc.category,
      tags: doc.tags,
    }));
    dispatch({ type: 'SET_ITEMS', items: mapped });
  }, [documents, dispatch]);

  // Persist selectedItemId
  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_ITEM_KEY, selectedItemId);
    } catch {}
  }, [selectedItemId]);

  // Loading state — queries haven't resolved yet
  if (me === undefined) {
    return null;
  }

  // Not authenticated (shouldn't happen — Clerk middleware handles)
  if (me === null) {
    return null;
  }

  // Onboarding gate: incomplete onboarding or no entities → redirect
  if (!me.onboardingComplete || (entities !== undefined && entities.length === 0)) {
    return <ClientRedirect href="/onboarding" />;
  }

  // Still loading entities
  if (entities === undefined) {
    return null;
  }

  // Mobile capture flow (full screen takeover)
  if (captureOpen) {
    return (
      <>
        {/* Desktop capture modal */}
        <div className="hidden lg:block" style={{ position: 'absolute', inset: 0 }}>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'grid',
            gridTemplateColumns: '248px 1fr 380px',
            background: '#fff', color: 'var(--ink)', fontFamily: 'var(--font)', overflow: 'hidden',
          }}>
            <DesktopSidebar onCapture={() => setCaptureOpen(true)} />
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '0.5px solid var(--sep)' }}>
              {children}
            </div>
            <DesktopInspector itemId={selectedItemId} />
          </div>
          <DesktopUploadModal onClose={() => setCaptureOpen(false)} />
        </div>
        {/* Mobile capture flow */}
        <div className="lg:hidden" style={{ position: 'absolute', inset: 0, background: 'var(--background)', fontFamily: 'var(--font)', color: 'var(--ink)' }}>
          <CaptureFlow
            onClose={() => setCaptureOpen(false)}
            onFiled={(pages) => {
              setCaptureOpen(false);
              setFiledToast(`Uploaded ${pages.length} page${pages.length > 1 ? 's' : ''} · processing`);
              setTimeout(() => setFiledToast(null), 3000);
            }}
          />
        </div>
      </>
    );
  }

  return (
    <SelectedItemContext.Provider value={{ selectedItemId, setSelectedItemId }}>
      {/* Desktop layout */}
      <div className="hidden lg:grid" style={{
        position: 'absolute', inset: 0,
        gridTemplateColumns: '248px 1fr 380px',
        background: '#fff', color: 'var(--ink)', fontFamily: 'var(--font)', overflow: 'hidden',
      }}>
        <DesktopSidebar onCapture={() => setCaptureOpen(true)} />
        <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '0.5px solid var(--sep)' }}>
          {children}
        </main>
        <DesktopInspector itemId={selectedItemId} />
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden" style={{
        position: 'absolute', inset: 0, background: 'var(--background)',
        fontFamily: 'var(--font)', color: 'var(--ink)',
      }}>
        <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
        <TabBar onCapture={() => setCaptureOpen(true)} />
        {filedToast && <Toast message={filedToast} />}
      </div>
    </SelectedItemContext.Provider>
  );
}

const SelectedItemContext = createContext<{
  selectedItemId: string;
  setSelectedItemId: (id: string) => void;
}>({ selectedItemId: '', setSelectedItemId: () => {} });

export function useSelectedItem() {
  return useContext(SelectedItemContext);
}

function dateFromTimestamp(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function timestampLabel(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 16).replace('T', ' ');
}

function itemStatusFromDocument(status: string): ItemStatus {
  if (status === 'processing') return 'drafting';
  if (status === 'archived') return 'done';
  return status as ItemStatus;
}
