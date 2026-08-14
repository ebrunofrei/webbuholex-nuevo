import { Suspense } from 'react';
import { AdminComplaintDetail } from '@/components/workspace/admin-complaint-detail';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Detalle de Reclamo | BúhoLex',
};

interface PageProps {
  params: Promise<{
    complaintId: string;
  }>;
}

export default async function AdminComplaintDetailPage({ params }: PageProps) {
  const { complaintId } = await params;

  return (
    <Suspense fallback={<div>Cargando detalle...</div>}>
      <AdminComplaintDetail complaintId={complaintId} />
    </Suspense>
  );
}
