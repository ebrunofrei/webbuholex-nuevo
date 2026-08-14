import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach, afterEach, Mock } from 'vitest';
import { AdminComplaintResumeReviewForm } from '../components/workspace/admin-complaint-resume-review-form';

describe('AdminComplaintResumeReviewForm', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('submits successfully with exact endpoint and body (HTTP 200) and triggers onRefresh', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({ ok: true, status: 200 });
    const onRefresh = vi.fn();

    render(<AdminComplaintResumeReviewForm complaintId="123" onRefresh={onRefresh} />);

    const textarea = screen.getByLabelText(/Nota de reanudación/i);
    fireEvent.change(textarea, { target: { value: 'Revisado.' } });

    const button = screen.getByRole('button', { name: 'Reanudar Revisión' });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Reanudando...');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/complaints/123/resume-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedCurrentStatus: 'awaiting_information',
          returnNote: 'Revisado.',
        }), // no requestId
      });
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('guards against synchronous double-submit', async () => {
    (global.fetch as Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, status: 200 }), 100))
    );
    const onRefresh = vi.fn();

    render(<AdminComplaintResumeReviewForm complaintId="123" onRefresh={onRefresh} />);

    const textarea = screen.getByLabelText(/Nota de reanudación/i);
    fireEvent.change(textarea, { target: { value: 'Texto válido.' } });

    const button = screen.getByRole('button', { name: 'Reanudar Revisión' });
    fireEvent.click(button);
    fireEvent.click(button); // double click

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('handles canonical 404', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({ ok: false, status: 404 });
    render(<AdminComplaintResumeReviewForm complaintId="123" onRefresh={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Nota de reanudación/i), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reanudar Revisión' }));

    await waitFor(() => {
      expect(screen.getByText('Denuncia no encontrada.')).toBeInTheDocument();
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  it('handles all three canonical 409 and retains lock during reconciliation', async () => {
    const codes = [
      { code: 'complaint_stale_status', msg: 'El estado de la denuncia ha cambiado.' },
      { code: 'complaint_no_open_information_request', msg: 'No hay una solicitud de información pendiente.' },
      { code: 'complaint_multiple_open_information_requests', msg: 'Múltiples solicitudes pendientes encontradas.' },
    ];

    for (const { code, msg } of codes) {
      const onRefresh = vi.fn();
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ code }),
      });
      const { unmount } = render(<AdminComplaintResumeReviewForm complaintId="123" onRefresh={onRefresh} />);

      fireEvent.change(screen.getByLabelText(/Nota de reanudación/i), { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: 'Reanudar Revisión' }));

      await waitFor(() => {
        expect(screen.getByText(msg)).toBeInTheDocument();
        expect(onRefresh).toHaveBeenCalled();
        expect(screen.getByRole('button')).toBeDisabled();
      });
      unmount();
    }
  });

  it('handles both canonical 422 and releases lock', async () => {
    const codes = [
      { code: 'complaint_resume_review_note_required', msg: 'La nota de respuesta es obligatoria.' },
      { code: 'complaint_resume_review_note_too_long', msg: 'La nota de respuesta es demasiado larga.' },
    ];

    for (const { code, msg } of codes) {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ code }),
      });
      const { unmount } = render(<AdminComplaintResumeReviewForm complaintId="123" onRefresh={vi.fn()} />);

      fireEvent.change(screen.getByLabelText(/Nota de reanudación/i), { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: 'Reanudar Revisión' }));

      await waitFor(() => {
        expect(screen.getByText(msg)).toBeInTheDocument();
        expect(screen.getByRole('button')).not.toBeDisabled();
      });
      unmount();
    }
  });

  it('handles network failure / 5xx', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({ ok: false, status: 500 });
    render(<AdminComplaintResumeReviewForm complaintId="123" onRefresh={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Nota de reanudación/i), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reanudar Revisión' }));

    await waitFor(() => {
      expect(screen.getByText('Ocurrió un error inesperado al procesar la reanudación.')).toBeInTheDocument();
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });
});
