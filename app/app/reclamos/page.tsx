import { Suspense } from 'react';
import { AdminComplaintsList } from '@/components/workspace/admin-complaints-list';

export const metadata = {
  title: 'Reclamos | BúhoLex',
};

export default function AdminComplaintsPage() {
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
