'use client';

import React, { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { PageHeader } from '@/components/desktop/page-header';
import { NavBar } from '@/components/ui/nav-bar';

export default function AdminPage() {
  const [search, setSearch] = useState('');
  const isAdmin = useQuery(api.admin.isAdmin);

  if (isAdmin === undefined) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40, color: 'var(--muted)', fontSize: 14 }}>
        Checking access...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', marginBottom: 8 }}>Unauthorized</div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>You do not have admin access.</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="lg:hidden" style={{ paddingBottom: 100 }}>
        <NavBar large title="Admin" sub="Tenant monitoring & usage" />
        <AdminDashboard search={search} />
      </div>

      <div className="hidden lg:flex lg:flex-col lg:h-full">
        <PageHeader
          title="Admin"
          subtitle="Tenant monitoring & usage"
          search={search}
          setSearch={setSearch}
          onCapture={() => {}}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <AdminDashboard search={search} />
        </div>
      </div>
    </>
  );
}
