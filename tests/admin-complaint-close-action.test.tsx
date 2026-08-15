import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach, afterEach, Mock } from 'vitest';
import { AdminComplaintCloseAction } from '../components/workspace/admin-complaint-close-action';

describe('AdminComplaintCloseAction', () => {
  const mockOnRefresh = vi.fn();
  const mockComplaintId = 'c-123';

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders initial state correctly', () => {
    render(<AdminComplaintCloseAction complaintId={mockComplaintId} onRefresh={mockOnRefresh} />);
    expect(screen.getByRole('button', { name: 'Cerrar reclamo' })).toBeInTheDocument();
  });

  it('enters confirmation state when clicked', () => {
    render(<AdminComplaintCloseAction complaintId={mockComplaintId} onRefresh={mockOnRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar reclamo' }));

    expect(screen.getByText(/Esta acción cerrará administrativamente el reclamo/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar cierre' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('cancels confirmation', () => {
    render(<AdminComplaintCloseAction complaintId={mockComplaintId} onRefresh={mockOnRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar reclamo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('button', { name: 'Cerrar reclamo' })).toBeInTheDocument();
    expect(screen.queryByText(/Esta acción cerrará administrativamente el reclamo/)).not.toBeInTheDocument();
  });

  it('handles successful closure', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({ ok: true });

    render(<AdminComplaintCloseAction complaintId={mockComplaintId} onRefresh={mockOnRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar reclamo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cierre' }));

    expect(screen.getByRole('button', { name: 'Cerrando...' })).toBeDisabled();
    
    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalled();
    });
    
    expect(global.fetch).toHaveBeenCalledWith(`/api/admin/complaints/${mockComplaintId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedCurrentStatus: 'answered' }),
    });
  });

  it('handles 409 conflict gracefully', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({ ok: false, status: 409 });

    render(<AdminComplaintCloseAction complaintId={mockComplaintId} onRefresh={mockOnRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar reclamo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cierre' }));

    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it('handles 404 error', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({ ok: false, status: 404 });

    render(<AdminComplaintCloseAction complaintId={mockComplaintId} onRefresh={mockOnRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar reclamo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cierre' }));

    await waitFor(() => {
      expect(screen.getByText('El reclamo no fue encontrado.')).toBeInTheDocument();
    });
    expect(mockOnRefresh).not.toHaveBeenCalled();
  });

  it('handles generic 500 error', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({ ok: false, status: 500 });

    render(<AdminComplaintCloseAction complaintId={mockComplaintId} onRefresh={mockOnRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar reclamo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cierre' }));

    await waitFor(() => {
      expect(screen.getByText('Ocurrió un error al intentar cerrar el reclamo. Por favor, intenta nuevamente.')).toBeInTheDocument();
    });
    expect(mockOnRefresh).not.toHaveBeenCalled();
  });

  it('handles network error', async () => {
    (global.fetch as Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<AdminComplaintCloseAction complaintId={mockComplaintId} onRefresh={mockOnRefresh} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar reclamo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cierre' }));

    await waitFor(() => {
      expect(screen.getByText('Error de conexión. Por favor, revisa tu conexión e intenta nuevamente.')).toBeInTheDocument();
    });
    expect(mockOnRefresh).not.toHaveBeenCalled();
  });
});
