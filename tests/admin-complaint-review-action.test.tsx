import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach, afterEach, Mock } from 'vitest';
import { AdminComplaintReviewAction } from '../components/workspace/admin-complaint-review-action';

const mockComplaintId = 'c1234567-89ab-cdef-0123-456789abcdef';

describe('AdminComplaintReviewAction', () => {
  let fetchMock: Mock;
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    mockOnRefresh.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders when canReview is true and status is received', () => {
    render(<AdminComplaintReviewAction complaintId={mockComplaintId} currentStatus="received" canReview={true} onRefresh={mockOnRefresh} />);
    expect(screen.getByRole('button', { name: /Iniciar revisión/i })).toBeInTheDocument();
  });

  it('does not render when canReview is false', () => {
    render(<AdminComplaintReviewAction complaintId={mockComplaintId} currentStatus="received" canReview={false} onRefresh={mockOnRefresh} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('does not render when status is not received', () => {
    render(<AdminComplaintReviewAction complaintId={mockComplaintId} currentStatus="under_review" canReview={true} onRefresh={mockOnRefresh} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('posts correct payload and calls onRefresh on success', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'under_review' }),
    });

    render(<AdminComplaintReviewAction complaintId={mockComplaintId} currentStatus="received" canReview={true} onRefresh={mockOnRefresh} />);

    const button = screen.getByRole('button', { name: /Iniciar revisión/i });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/Iniciando revisión…/i);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(`/api/admin/complaints/${mockComplaintId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedCurrentStatus: 'received' }),
      });
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it('prevents double submit', async () => {
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100)));

    render(<AdminComplaintReviewAction complaintId={mockComplaintId} currentStatus="received" canReview={true} onRefresh={mockOnRefresh} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(button);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows conflict message and refetches on 409', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 409 });

    render(<AdminComplaintReviewAction complaintId={mockComplaintId} currentStatus="received" canReview={true} onRefresh={mockOnRefresh} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/El estado del reclamo cambió mientras lo revisabas./i);
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it('shows expiration message on 401', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 });

    render(<AdminComplaintReviewAction complaintId={mockComplaintId} currentStatus="received" canReview={true} onRefresh={mockOnRefresh} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/Tu sesión ha expirado./i);
      expect(mockOnRefresh).not.toHaveBeenCalled();
    });
  });

  it('hides action on 403', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403 });

    render(<AdminComplaintReviewAction complaintId={mockComplaintId} currentStatus="received" canReview={true} onRefresh={mockOnRefresh} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(mockOnRefresh).not.toHaveBeenCalled();
    });
  });

  it('refetches on 404', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 });

    render(<AdminComplaintReviewAction complaintId={mockComplaintId} currentStatus="received" canReview={true} onRefresh={mockOnRefresh} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it('shows error on 503 and allows retry', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });

    render(<AdminComplaintReviewAction complaintId={mockComplaintId} currentStatus="received" canReview={true} onRefresh={mockOnRefresh} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/El servicio no está disponible temporalmente/i);
    });

    expect(button).not.toBeDisabled();
  });

  it('shows error on 500 and allows retry', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 });

    render(<AdminComplaintReviewAction complaintId={mockComplaintId} currentStatus="received" canReview={true} onRefresh={mockOnRefresh} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/Ocurrió un error inesperado/i);
    });

    expect(button).not.toBeDisabled();
  });

  it('shows client contract error on 400', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 400 });

    render(<AdminComplaintReviewAction complaintId={mockComplaintId} currentStatus="received" canReview={true} onRefresh={mockOnRefresh} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/No se pudo iniciar la revisión./i);
    });
  });

  it('refetches on malformed 200', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new Error('Malformed JSON'); },
    });

    render(<AdminComplaintReviewAction complaintId={mockComplaintId} currentStatus="received" canReview={true} onRefresh={mockOnRefresh} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/Ocurrió un error inesperado/i);
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
