import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminComplaintResponseForm } from '../components/workspace/admin-complaint-response-form';
import { ProviderResponseHttpSchema } from '../lib/complaints/provider-response.contract';

describe('AdminComplaintResponseForm Shared Contract', () => {
  it('should export the schema correctly', () => {
    expect(ProviderResponseHttpSchema).toBeDefined();
  });
  
  it('should validate correctly based on limits', () => {
    const validData = {
      expectedCurrentStatus: 'under_review',
      responseChannel: 'email',
      responderName: 'Juan',
      responderRole: 'Representante',
      responseText: 'Respuesta'
    };
    expect(ProviderResponseHttpSchema.safeParse(validData).success).toBe(true);

    const invalidData = {
      ...validData,
      responderName: 'a'.repeat(101) // Limit is 100
    };
    expect(ProviderResponseHttpSchema.safeParse(invalidData).success).toBe(false);
  });
});

describe('AdminComplaintResponseForm Component', () => {
  const mockOnRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should render form fields', () => {
    render(<AdminComplaintResponseForm complaintId="test-123" currentStatus="under_review" onRefresh={mockOnRefresh} />);
    expect(screen.getByLabelText(/Nombre que figurará/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Cargo que figurará/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Respuesta al consumidor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Acciones realizadas/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Registrar respuesta/i })).toBeInTheDocument();
  });

  it('should validate required fields locally before submit', async () => {
    render(<AdminComplaintResponseForm complaintId="test-123" currentStatus="under_review" onRefresh={mockOnRefresh} />);
    const submitBtn = screen.getByRole('button', { name: /Registrar respuesta/i });
    
    // Attempt submit
    fireEvent.click(submitBtn);

    expect(await screen.findAllByText('Este campo es obligatorio.')).toHaveLength(3);
    
    // Ensure fetch wasn't called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle successful 201 response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 201,
      json: vi.fn().mockResolvedValue({ success: true })
    });

    render(<AdminComplaintResponseForm complaintId="test-123" currentStatus="under_review" onRefresh={mockOnRefresh} />);
    
    fireEvent.change(screen.getByLabelText(/Nombre que figurará/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Cargo que figurará/i), { target: { value: 'Admin' } });
    fireEvent.change(screen.getByLabelText(/Respuesta al consumidor/i), { target: { value: 'Hola' } });

    fireEvent.click(screen.getByRole('button', { name: /Registrar respuesta/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/complaints/test-123/responses', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          expectedCurrentStatus: 'under_review',
          responseChannel: 'email',
          responderName: 'Juan',
          responderRole: 'Admin',
          responseText: 'Hola'
        })
      }));
    });

    await waitFor(() => {
      expect(screen.getByText('Respuesta registrada correctamente.')).toBeInTheDocument();
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it('should map 409 conflict error', async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 409 });

    render(<AdminComplaintResponseForm complaintId="test-123" currentStatus="under_review" onRefresh={mockOnRefresh} />);
    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Cargo/i), { target: { value: 'Admin' } });
    fireEvent.change(screen.getByLabelText(/Respuesta al consumidor/i), { target: { value: 'Hola' } });

    fireEvent.click(screen.getByRole('button', { name: /Registrar respuesta/i }));

    await waitFor(() => {
      expect(screen.getByText('El reclamo cambió mientras preparabas la respuesta. Actualiza el detalle para continuar.')).toBeInTheDocument();
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it('should map 422 domain validation errors', async () => {
    global.fetch = vi.fn().mockResolvedValue({ 
      status: 422,
      json: vi.fn().mockResolvedValue({ error: { code: 'complaint_response_text_too_long' } })
    });

    render(<AdminComplaintResponseForm complaintId="test-123" currentStatus="under_review" onRefresh={mockOnRefresh} />);
    fireEvent.change(screen.getByLabelText(/Nombre/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Cargo/i), { target: { value: 'Admin' } });
    fireEvent.change(screen.getByLabelText(/Respuesta al consumidor/i), { target: { value: 'Hola' } });

    fireEvent.click(screen.getByRole('button', { name: /Registrar respuesta/i }));

    await waitFor(() => {
      expect(screen.getByText('El texto de la respuesta excede el límite permitido.')).toBeInTheDocument();
    });
  });

  it('prevents rapid double submission synchronously', async () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
      status: 201,
      json: vi.fn().mockResolvedValue({ success: true })
    }), 100)));

    render(<AdminComplaintResponseForm complaintId="test-123" currentStatus="under_review" onRefresh={mockOnRefresh} />);
    
    fireEvent.change(screen.getByLabelText(/Nombre que figurará/i), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText(/Cargo que figurará/i), { target: { value: 'Admin' } });
    fireEvent.change(screen.getByLabelText(/Respuesta al consumidor/i), { target: { value: 'Hola' } });

    const form = screen.getByRole('button', { name: /Registrar respuesta/i }).closest('form')!;
    
    // Trigger rapid double submit before any state update / re-render
    fireEvent.submit(form);
    fireEvent.submit(form);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });
});
