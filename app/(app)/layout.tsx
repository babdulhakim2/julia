'use client';

import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { usePathname, useRouter } from 'next/navigation';
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
import { useActiveWorkspace } from '@/lib/admin-view';
import { Ic } from '@/components/icons';

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
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const { dispatch } = useStore();
  const storeUser = useMutation(api.users.store);
  const userSynced = useRef(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [filedToast, setFiledToast] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState(loadSelectedItemId);

  // Convex-backed onboarding gate
  const me = useQuery(api.users.getMe);
  const { workspace, isViewingClient, workspaceName, clearView } = useActiveWorkspace();
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
      storeUser().catch((error) => {
        userSynced.current = false;
        setSyncError(error instanceof Error ? error.message : 'Could not sync user');
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
      drafted: Boolean(doc.draftResponse),
      draftText: doc.draftResponse,
      outcomeMessage: doc.outcomeMessage,
      intakeCategory: doc.intakeCategory,
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

  if (syncError) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, color: 'var(--muted)', fontSize: 14 }}>
        Could not sync your account. Sign out and back in, then try again.
      </div>
    );
  }

  // Loading state — queries haven't resolved yet, or the first user sync is in flight
  if (me === undefined || (isAuthenticated && me === null)) {
    return null;
  }
  if (me === null) {
    return null;
  }

  if (workspace === undefined) {
    return null;
  }

  if (workspace === null && isViewingClient) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, color: 'var(--muted)', fontSize: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, color: 'var(--ink)', fontWeight: 700, marginBottom: 8 }}>Client workspace unavailable</div>
          <button onClick={clearView} style={{
            border: 0, borderRadius: 8, background: 'var(--ink)', color: '#fff',
            padding: '8px 12px', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 700,
          }}>Exit client view</button>
        </div>
      </div>
    );
  }

  // Onboarding gate: incomplete user, no workspace, or no entities → redirect
  if (!isViewingClient && (!me.onboardingComplete || workspace === null || (entities !== undefined && entities.length === 0))) {
    return <ClientRedirect href="/onboarding" />;
  }

  // Still loading entities
  if (workspace === null || entities === undefined) {
    return null;
  }

  function openCapture() {
    if (isViewingClient) {
      setFiledToast('Exit client view before uploading');
      setTimeout(() => setFiledToast(null), 2600);
      return;
    }
    setCaptureOpen(true);
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
            <DesktopSidebar onCapture={openCapture} />
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '0.5px solid var(--sep)' }}>
              {children}
            </div>
            <DesktopInspector itemId={selectedItemId} readOnly={isViewingClient} />
          </div>
          {isViewingClient && <AdminViewBanner name={workspace.name || workspaceName} onExit={clearView} />}
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
        <DesktopSidebar onCapture={openCapture} />
        <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '0.5px solid var(--sep)' }}>
          {children}
        </main>
        <DesktopInspector itemId={selectedItemId} readOnly={isViewingClient} />
        {isViewingClient && <AdminViewBanner name={workspace.name || workspaceName} onExit={clearView} />}
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden" style={{
        position: 'absolute', inset: 0, background: 'var(--background)',
        fontFamily: 'var(--font)', color: 'var(--ink)',
      }}>
        <div style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
        {!pathname.startsWith('/ask') && (
          <button onClick={() => router.push('/ask')} aria-label="Ask Julia" style={{
            position: 'absolute', top: 16, right: 16, zIndex: 35,
            width: 42, height: 42, borderRadius: 21,
            border: '0.5px solid rgba(0,0,0,0.06)',
            background: '#fff', color: 'var(--ink)',
            boxShadow: '0 10px 28px rgba(0,0,0,0.14)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
          }}>
            {Ic.sparkle(21, 'var(--ink)')}
          </button>
        )}
        <TabBar onCapture={openCapture} />
        {isViewingClient && <AdminViewBanner name={workspace.name || workspaceName} onExit={clearView} mobile />}
        {filedToast && <Toast message={filedToast} />}
      </div>
    </SelectedItemContext.Provider>
  );
}

function AdminViewBanner({ name, onExit, mobile }: { name: string; onExit: () => void; mobile?: boolean }) {
  return (
    <div style={{
      position: 'absolute',
      top: mobile ? 8 : 12,
      left: mobile ? 10 : '50%',
      right: mobile ? 10 : 'auto',
      transform: mobile ? 'none' : 'translateX(-50%)',
      zIndex: 80,
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 10px 8px 12px',
      borderRadius: 999,
      background: 'rgba(28,28,30,0.94)',
      color: '#fff',
      boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
      fontFamily: 'var(--font)',
      pointerEvents: 'auto',
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        Viewing client: {name}
      </span>
      <button onClick={onExit} style={{
        border: 0,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.16)',
        color: '#fff',
        padding: '5px 8px',
        cursor: 'pointer',
        fontSize: 12,
        fontWeight: 700,
        fontFamily: 'var(--font)',
      }}>Exit</button>
    </div>
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
