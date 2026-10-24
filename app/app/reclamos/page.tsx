import { redirect } from 'next/navigation';
import { authorizeAdminComplaintsRead } from '@/lib/complaints/complaints-admin-read-http-runtime';

export default async function LegacyAppComplaintsPage() {
  const authResult = await authorizeAdminComplaintsRead();
  if (authResult.kind === 'authorized') {
    redirect('/admin/reclamos');
  }
  redirect('/app');
}
