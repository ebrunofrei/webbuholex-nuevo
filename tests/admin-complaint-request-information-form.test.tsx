import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach, afterEach, Mock } from 'vitest';
import { AdminComplaintRequestInformationForm } from '../components/workspace/admin-complaint-request-information-form';

describe('AdminComplaintRequestInformationForm', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('submits successfully with exact endpoint and body (HTTP 200) and triggers onRefresh', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({ ok: true, status: 200 });
    const onRefresh = vi.fn();

    render(<AdminComplaintRequestInformationForm complaintId="123" onRefresh={onRefresh} />);

    const textarea = screen.getByLabelText(/Motivo de la solicitud/i);
    fireEvent.change(textarea, { target: { value: 'Necesito más información.' } });

    const button = screen.getByRole('button', { name: 'Solicitar Información' });
    fireEvent.click(button);

    // Pending state
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Procesando...');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/complaints/123/request-information', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedCurrentStatus: 'under_review',
          requestText: 'Necesito más información.',
        }),
      });
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('guards against synchronous double-submit', async () => {
    (global.fetch as Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, status: 200 }), 100))
    );
    const onRefresh = vi.fn();

    render(<AdminComplaintRequestInformationForm complaintId="123" onRefresh={onRefresh} />);

    const textarea = screen.getByLabelText(/Motivo de la solicitud/i);
    fireEvent.change(textarea, { target: { value: 'Texto válido.' } });

    const button = screen.getByRole('button', { name: 'Solicitar Información' });
    fireEvent.click(button);
    fireEvent.click(button); // double click

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('handles canonical 404', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({ ok: false, status: 404 });
    render(<AdminComplaintRequestInformationForm complaintId="123" onRefresh={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Motivo de la solicitud/i), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar Información' }));

    await waitFor(() => {
      expect(screen.getByText('Denuncia no encontrada.')).toBeInTheDocument();
      expect(screen.getByRole('button')).not.toBeDisabled(); // lock released
    });
  });

  it('handles all three canonical 409 and retains lock during reconciliation', async () => {
    const codes = [
      { code: 'complaint_stale_status', msg: 'El estado de la denuncia ha cambiado.' },
      { code: 'complaint_open_information_request_exists', msg: 'Ya existe una solicitud de información pendiente.' },
      { code: 'complaint_information_request_sequence_conflict', msg: 'Conflicto en la secuencia de solicitudes.' },
    ];

    for (const { code, msg } of codes) {
      const onRefresh = vi.fn();
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ code }),
      });
      const { unmount } = render(<AdminComplaintRequestInformationForm complaintId="123" onRefresh={onRefresh} />);

      fireEvent.change(screen.getByLabelText(/Motivo de la solicitud/i), { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: 'Solicitar Información' }));

      await waitFor(() => {
        expect(screen.getByText(msg)).toBeInTheDocument();
        expect(onRefresh).toHaveBeenCalled();
        // button should remain disabled as lock is retained until refresh unmounts/remounts
        expect(screen.getByRole('button')).toBeDisabled();
      });
      unmount();
    }
  });

  it('handles both canonical 422 and releases lock', async () => {
    const codes = [
      { code: 'complaint_request_information_text_required', msg: 'El texto de la solicitud es obligatorio.' },
      { code: 'complaint_request_information_text_too_long', msg: 'El texto de la solicitud es demasiado largo.' },
    ];

    for (const { code, msg } of codes) {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ code }),
      });
      const { unmount } = render(<AdminComplaintRequestInformationForm complaintId="123" onRefresh={vi.fn()} />);

      fireEvent.change(screen.getByLabelText(/Motivo de la solicitud/i), { target: { value: 'Test' } });
      fireEvent.click(screen.getByRole('button', { name: 'Solicitar Información' }));

      await waitFor(() => {
        expect(screen.getByText(msg)).toBeInTheDocument();
        expect(screen.getByRole('button')).not.toBeDisabled(); // lock released
      });
      unmount();
    }
  });

  it('handles network failure / 5xx', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({ ok: false, status: 500 });
    render(<AdminComplaintRequestInformationForm complaintId="123" onRefresh={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/Motivo de la solicitud/i), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar Información' }));

    await waitFor(() => {
      expect(screen.getByText('Ocurrió un error inesperado al procesar la solicitud.')).toBeInTheDocument();
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });
});
