'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { ClientRedirect } from '@/components/ui/client-redirect';

export default function LegacyEntityFilesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const entityId = String(params.entityId ?? '');
  const search = searchParams.toString();

  return <ClientRedirect href={`/docs/${entityId}${search ? `?${search}` : ''}`} />;
}
