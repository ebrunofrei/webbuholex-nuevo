import { Suspense } from 'react';
import { AdminComplaintsList } from '@/components/workspace/admin-complaints-list';
import { authorizeAdminComplaintsRead } from '@/lib/complaints/complaints-admin-read-http-runtime';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Reclamos | BúhoLex Admin',
};

export default async function AdminComplaintsPage() {
  const authResult = await authorizeAdminComplaintsRead();
  if (authResult.kind !== 'authorized') {
    redirect('/admin');
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
        Reclamos
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
        Listado de reclamos recibidos en el sistema.
      </p>

      <Suspense fallback={<div>Cargando interfaz...</div>}>
        <AdminComplaintsList />
      </Suspense>
    </div>
  );
}
