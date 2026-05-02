'use client';

import React, { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { useSelectedItem } from '../../layout';
import { FileManager } from '@/components/mobile/screens/file-manager';
import { EntityFiles } from '@/components/desktop/entity-files';
import { PageHeader } from '@/components/desktop/page-header';

export default function EntityFilePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const entityId = params.entityId as string;
  const folderId = searchParams.get('folder');
  const { state } = useStore();
  const { selectedItemId, setSelectedItemId } = useSelectedItem();
  const [search, setSearch] = useState('');

  const entity = state.entities.find(e => e.id === entityId);
  const items = state.items.filter(i => i.entity === entityId);

  if (!entity) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
        Entity not found.
      </div>
    );
  }

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden" style={{ paddingBottom: 100 }}>
        <FileManager
          entityId={entityId}
          onBack={() => router.push('/files')}
          onOpenItem={(id) => setSelectedItemId(id)}
        />
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex lg:flex-col lg:h-full">
        <PageHeader
          title={entity.name}
          subtitle={entity.sub}
          search={search}
          setSearch={setSearch}
          onCapture={() => {}}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <EntityFiles
            entity={entity}
            items={items}
            search={search}
            selectedId={selectedItemId}
            onSelect={setSelectedItemId}
            activeFolderId={folderId}
          />
        </div>
      </div>
    </>
  );
}
