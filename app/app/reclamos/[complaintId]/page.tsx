import { redirect } from 'next/navigation';
import { authorizeAdminComplaintsRead } from '@/lib/complaints/complaints-admin-read-http-runtime';

interface PageProps {
  params: Promise<{
    complaintId: string;
  }>;
}

export default async function LegacyAppComplaintDetailPage({ params }: PageProps) {
  const { complaintId } = await params;
  const authResult = await authorizeAdminComplaintsRead();
  if (authResult.kind === 'authorized') {
    redirect(`/admin/reclamos/${encodeURIComponent(complaintId)}`);
  }
  redirect('/app');
}
