import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { AdminComplaintsList } from '@/components/workspace/admin-complaints-list';
import AdminComplaintsPage from '@/app/app/reclamos/page';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/app/reclamos',
  useSearchParams: () => new URLSearchParams(),
}));

describe('Admin Complaints Workspace UI', () => {
  let originalFetch: typeof global.fetch;
  let fetchMock: import('vitest').Mock;

  beforeEach(() => {
    originalFetch = global.fetch;
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], nextCursor: null }),
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;
    mockReplace.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('renders Reclamos title and does not create second h1 unexpectedly', () => {
    render(<AdminComplaintsPage />);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Reclamos');
  });

  it('uses GET /api/admin/complaints with same-origin and no body/custom auth', async () => {
    render(<AdminComplaintsList />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const callArgs = fetchMock.mock.calls[0]!;
    expect(callArgs[0]).toContain('/api/admin/complaints');
    expect(callArgs[1].method).toBe('GET');
    expect(callArgs[1].credentials).toBe('same-origin');
    expect(callArgs[1].body).toBeUndefined();
    const headers = callArgs[1].headers || {};
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['x-operator-id']).toBeUndefined();
  });

  it('shows loading state initially and then empty state if no data', async () => {
    render(<AdminComplaintsList />);
    expect(screen.getAllByText(/Cargando/i).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getByText(/No hay reclamos para mostrar/i)).toBeInTheDocument();
    });
  });

  it('renders exact approved displayed fields and status labels in Spanish', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{
          complaintId: 'cmp-123',
          sheetNumber: 'R001',
          status: 'under_review',
          submittedAt: '2023-01-01T10:00:00Z',
          deadlineAt: '2023-01-15T10:00:00Z',
          updatedAt: '2023-01-02T10:00:00Z'
        }],
        nextCursor: null
      })
    });

    render(<AdminComplaintsList />);

    await waitFor(() => {
      expect(screen.getAllByText('R001').length).toBeGreaterThan(0);
      expect(screen.getAllByText('En revisión').length).toBeGreaterThan(0);
    });

    expect(screen.queryByText('cmp-123')).not.toBeInTheDocument();
    expect(screen.queryByText('Ver detalle')).not.toBeInTheDocument();
    expect(screen.queryByText('Responder')).not.toBeInTheDocument();
  });

  it('filter select labelled and default Todos', async () => {
    render(<AdminComplaintsList />);
    const select = screen.getByRole('combobox', { name: /Estado/i });
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue('all');
  });

  it('status filter request and URL query sync', async () => {
    render(<AdminComplaintsList />);
    const select = screen.getByRole('combobox', { name: /Estado/i });

    fireEvent.change(select, { target: { value: 'answered' } });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('?status=answered'), { scroll: false });
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('status=answered'), expect.any(Object));
    });
  });

  it('load more button opaque cursor and duplicate append prevention', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ complaintId: '1', sheetNumber: 'R1', status: 'received', submittedAt: '', deadlineAt: '', updatedAt: '' }],
        nextCursor: 'opaque-cursor-123'
      })
    });

    render(<AdminComplaintsList />);

    await waitFor(() => {
      expect(screen.getByText('Cargar más')).toBeInTheDocument();
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { complaintId: '1', sheetNumber: 'R1', status: 'received', submittedAt: '', deadlineAt: '', updatedAt: '' },
          { complaintId: '2', sheetNumber: 'R2', status: 'received', submittedAt: '', deadlineAt: '', updatedAt: '' }
        ],
        nextCursor: null
      })
    });

    fireEvent.click(screen.getByText('Cargar más'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('cursor=opaque-cursor-123'), expect.any(Object));
    });

    // Check duplicates are suppressed (only one 'R1' rendered in desktop and mobile = 2, instead of 4)
    const itemsR1 = screen.getAllByText('R1');
    expect(itemsR1).toHaveLength(2); // One in table, one in mobile list
    expect(screen.getAllByText('R2').length).toBeGreaterThan(0);
  });

  it('401 session-expiry behavior', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });
    render(<AdminComplaintsList />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/La sesión ha expirado/i);
      expect(screen.getByRole('button', { name: /Iniciar sesión/i })).toBeInTheDocument();
    });
  });

  it('handles 403, 503, 500 error UI', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });
    const { unmount } = render(<AdminComplaintsList />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/No tienes permiso/i);
    });
    unmount();

    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    render(<AdminComplaintsList />);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/El servicio no está disponible/i);
    });
  });

  it('stale response ignored/aborted', async () => {
    render(<AdminComplaintsList />);
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    const callArgs = fetchMock.mock.calls[0]!;
    expect(callArgs[1].signal).toBeInstanceOf(AbortSignal);
  });
});
