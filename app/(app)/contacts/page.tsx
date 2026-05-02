'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CONTACTS } from '@/lib/data';
import { ContactsView } from '@/components/mobile/screens/contacts';
import { DesktopContacts } from '@/components/desktop/desktop-contacts';
import { PageHeader } from '@/components/desktop/page-header';

export default function ContactsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden" style={{ paddingBottom: 100 }}>
        <ContactsView onBack={() => router.push('/files')} />
      </div>

      {/* Desktop */}
      <div className="hidden lg:flex lg:flex-col lg:h-full">
        <PageHeader
          title="Contacts"
          subtitle={`${CONTACTS.length} people`}
          search={search}
          setSearch={setSearch}
          onCapture={() => {}}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <DesktopContacts />
        </div>
      </div>
    </>
  );
}
