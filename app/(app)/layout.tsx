'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { DesktopSidebar } from '@/components/desktop/sidebar';
import { DesktopInspector } from '@/components/desktop/inspector';
import { TabBar } from '@/components/mobile/tab-bar';
import { DesktopUploadModal } from '@/components/desktop/upload-modal';
import { CaptureFlow } from '@/components/mobile/capture/capture-flow';
import { Toast } from '@/components/ui/toast';
import { ClientRedirect } from '@/components/ui/client-redirect';

const SELECTED_ITEM_KEY = 'secretary-selected-item';

function loadSelectedItemId() {
  if (typeof window === 'undefined') return 'i2';
  try {
    return localStorage.getItem(SELECTED_ITEM_KEY) || 'i2';
  } catch {
    return 'i2';
  }
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { state, hydrated } = useStore();
  const [captureOpen, setCaptureOpen] = useState(false);
  const [filedToast, setFiledToast] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState(loadSelectedItemId);

  // Persist selectedItemId
  useEffect(() => {
    try {
      localStorage.setItem(SELECTED_ITEM_KEY, selectedItemId);
    } catch {}
  }, [selectedItemId]);

  if (!hydrated) {
    return null;
  }

  if (!state.onboarded) {
    return <ClientRedirect href="/onboarding" />;
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
              setFiledToast(`Filed ${pages.length} item${pages.length > 1 ? 's' : ''} · reminders set`);
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

// Context for selectedItemId so route pages can access it
import { createContext, useContext } from 'react';

const SelectedItemContext = createContext<{
  selectedItemId: string;
  setSelectedItemId: (id: string) => void;
}>({ selectedItemId: 'i2', setSelectedItemId: () => {} });

export function useSelectedItem() {
  return useContext(SelectedItemContext);
}
