import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach, afterEach, Mock } from 'vitest';
import { AdminComplaintDetail } from '../components/workspace/admin-complaint-detail';
import { AdminComplaintDetailResponse } from '../lib/complaints/complaints-admin-detail-read-runtime';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

const mockData: AdminComplaintDetailResponse = {
  informationRequests: [],
  complaint: {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    sheetNumber: 'HOJA-2026-0001',
    status: 'received',
    submittedAt: '2026-08-10T10:00:00Z',
    deadlineAt: '2026-08-25',
    closedAt: null,
    consumer: {
      consumerType: 'natural_person',
      firstNames: 'Juan Carlos',
      lastNames: 'Pérez Gómez',
      legalName: null,
      representative: {
        firstNames: null,
        lastNames: null,
        relationship: null,
        role: null,
      },
    },
    subject: {
      kind: 'product',
      description: 'Laptop gamer de alta gama con problemas de sobrecalentamiento excesivo.',
      amountApplicability: 'applicable',
      amount: '5000.00',
      currency: 'PEN',
      transactionDate: '2026-08-01',
      referenceNumber: 'FACT-001-000234',
      channel: 'website',
    },
    details: {
      kind: 'complaint',
      facts: 'Compré la laptop el 1 de agosto. Al encenderla, se sobrecalienta en menos de 5 minutos y se apaga.\n\nHe intentado contactar al servicio al cliente 3 veces sin éxito.',
      requestedResolution: 'Solicito el cambio inmediato del equipo o la devolución total de mi dinero.',
    },
  },
  timeline: [
    {
      status: 'received',
      changedAt: '2026-08-10T10:00:00Z',
    },
  ],
  providerResponse: null,
};

describe('AdminComplaintDetail Workspace Component', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially', async () => {
    (global.fetch as Mock).mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    render(<AdminComplaintDetail complaintId="f47ac10b-58cc-4372-a567-0e02b2c3d479" />);

    expect(screen.getByText('Cargando detalle del reclamo...')).toBeInTheDocument();
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('loads and renders complaint detail successfully', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    render(<AdminComplaintDetail complaintId="f47ac10b-58cc-4372-a567-0e02b2c3d479" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'HOJA-2026-0001' })).toBeInTheDocument();
    });

    // Check status
    const statusBadges = screen.getAllByText('Recibido');
    expect(statusBadges.length).toBeGreaterThan(0);

    // Check consumer
    expect(screen.getByText('Juan Carlos')).toBeInTheDocument();
    expect(screen.getByText('Pérez Gómez')).toBeInTheDocument();
    expect(screen.getByText('Persona natural')).toBeInTheDocument();
    expect(screen.queryByText('natural_person')).not.toBeInTheDocument();

    // Check dates
    const dates = screen.getAllByText(/10\/08\/2026/);
    expect(dates.length).toBeGreaterThan(0);

    // Check subject
    expect(screen.getByText('Producto')).toBeInTheDocument();
    expect(screen.queryByText('product')).not.toBeInTheDocument();
    expect(screen.getByText('Laptop gamer de alta gama con problemas de sobrecalentamiento excesivo.')).toBeInTheDocument();
    expect(screen.getByText('PEN 5000.00')).toBeInTheDocument();
    expect(screen.getByText('FACT-001-000234')).toBeInTheDocument();
    expect(screen.getByText('Sitio web')).toBeInTheDocument();

    // Check complaint details
    const reclamoTexts = screen.getAllByText('Reclamo');
    expect(reclamoTexts.length).toBeGreaterThan(0);
    expect(screen.queryByText('complaint')).not.toBeInTheDocument();
    expect(screen.getByText(/Compré la laptop el 1 de agosto/)).toBeInTheDocument();
    expect(screen.getByText(/Solicito el cambio inmediato/)).toBeInTheDocument();

    // Timeline
    expect(screen.getByRole('heading', { name: 'Estado / Línea de tiempo' })).toBeInTheDocument();

    // Provider response empty state
    expect(screen.getByText('Aún no se ha registrado una respuesta.')).toBeInTheDocument();

    // Back link
    const backLink = screen.getByRole('link', { name: '← Volver a reclamos' });
    expect(backLink).toHaveAttribute('href', '/app/reclamos');
  });

  it('renders legal entity and representative correctly', async () => {
    const legalData = {
      ...mockData,
      complaint: {
        ...mockData.complaint,
        consumer: {
          consumerType: 'legal_entity',
          firstNames: null,
          lastNames: null,
          legalName: 'Empresa SA',
          representative: {
            firstNames: 'Ana',
            lastNames: 'López',
            relationship: 'legal_representative',
            role: 'Gerente',
          }
        },
        subject: {
          ...mockData.complaint.subject,
          amountApplicability: 'not_applicable',
          channel: 'in_person'
        }
      },
      providerResponse: {
        responseText: 'Respuesta proveedor',
        actionsTaken: 'Acciones',
        respondedAt: '2026-08-15T10:00:00Z',
        responseChannel: 'email'
      }
    } as AdminComplaintDetailResponse;

    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => legalData,
    });

    render(<AdminComplaintDetail complaintId="f47ac10b-58cc-4372-a567-0e02b2c3d479" />);
    await waitFor(() => {
      expect(screen.getByText('Persona jurídica')).toBeInTheDocument();
      expect(screen.queryByText('legal_entity')).not.toBeInTheDocument();
      expect(screen.getByText('Empresa SA')).toBeInTheDocument();
      expect(screen.getByText('Representante legal')).toBeInTheDocument();
      expect(screen.queryByText('legal_representative')).not.toBeInTheDocument();
      expect(screen.getByText('Ana')).toBeInTheDocument();
      expect(screen.getByText('Presencial')).toBeInTheDocument();
      expect(screen.queryByText('in_person')).not.toBeInTheDocument();
      expect(screen.getByText('Correo electrónico')).toBeInTheDocument();
      expect(screen.queryByText('email')).not.toBeInTheDocument();
    });
  });

  it('handles 401 error', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    render(<AdminComplaintDetail complaintId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Tu sesión ha expirado. Inicia sesión nuevamente para continuar.')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument();
  });

  it('handles 403 error', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    render(<AdminComplaintDetail complaintId="123" />);

    await waitFor(() => {
      expect(screen.getByText('No tienes permisos para ver este reclamo.')).toBeInTheDocument();
    });
  });

  it('handles 404 error', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(<AdminComplaintDetail complaintId="123" />);

    await waitFor(() => {
      expect(screen.getByText('No encontramos este reclamo.')).toBeInTheDocument();
    });
  });

  it('handles 503 error and retry', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
    });

    render(<AdminComplaintDetail complaintId="123" />);

    await waitFor(() => {
      expect(screen.getByText('El servicio no está disponible temporalmente. Por favor, intenta de nuevo más tarde.')).toBeInTheDocument();
    });

    // Setup for retry success
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'HOJA-2026-0001' })).toBeInTheDocument();
    });
  });

  it('handles malformed 200 response', async () => {
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ invalid: 'data' }),
    });

    render(<AdminComplaintDetail complaintId="123" />);

    await waitFor(() => {
      expect(screen.getByText('La respuesta del servidor no tiene el formato esperado.')).toBeInTheDocument();
    });
  });

  it('renders XSS as text, not HTML', async () => {
    const xssData = { ...mockData, complaint: { ...mockData.complaint, details: { ...mockData.complaint.details, facts: '<script>alert(1)</script>' } } };

    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => xssData,
    });

    render(<AdminComplaintDetail complaintId="123" />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'HOJA-2026-0001' })).toBeInTheDocument();
    });

    const factElement = screen.getByText('<script>alert(1)</script>');
    expect(factElement).toBeInTheDocument();
    expect(factElement.innerHTML).not.toContain('<script');
  });

  it('aborts fetch on unmount', () => {
    const abortSpy = vi.fn();
    class MockAbortController {
      abort = abortSpy;
      signal = {} as AbortSignal;
    }
    global.AbortController = MockAbortController as unknown as typeof AbortController;

    (global.fetch as Mock).mockImplementationOnce(() => new Promise(() => {}));

    const { unmount } = render(<AdminComplaintDetail complaintId="123" />);

    unmount();

    expect(abortSpy).toHaveBeenCalled();
  });

  describe('AdminComplaintResponseForm visibility', () => {
    it('shows form when canRespond=true, status=under_review, providerResponse=null', async () => {
      const data = { ...mockData, complaint: { ...mockData.complaint, status: 'under_review' as const } };
      (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => data });
      render(<AdminComplaintDetail complaintId="123" canRespond={true} />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Registrar respuesta/i })).toBeInTheDocument();
      });
    });

    it('shows form when canRespond=true, status=awaiting_information, providerResponse=null', async () => {
      const data = { ...mockData, complaint: { ...mockData.complaint, status: 'awaiting_information' as const } };
      (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => data });
      render(<AdminComplaintDetail complaintId="123" canRespond={true} />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Registrar respuesta/i })).toBeInTheDocument();
      });
    });

    it('hides form when providerResponse is present', async () => {
      const data = {
        ...mockData,
        complaint: { ...mockData.complaint, status: 'under_review' as const },
        providerResponse: {
          responseText: 'Respuesta',
          actionsTaken: null,
          respondedAt: '2026-08-15T10:00:00Z',
          responseChannel: 'email'
        }
      };
      (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => data });
      render(<AdminComplaintDetail complaintId="123" canRespond={true} />);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Registrar respuesta/i })).not.toBeInTheDocument();
        expect(screen.getByText('Respuesta')).toBeInTheDocument();
      });
    });

    it('hides form when status is received and providerResponse=null', async () => {
      const data = { ...mockData, complaint: { ...mockData.complaint, status: 'received' as const } };
      (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => data });
      render(<AdminComplaintDetail complaintId="123" canRespond={true} />);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Registrar respuesta/i })).not.toBeInTheDocument();
        expect(screen.getByText('Aún no se ha registrado una respuesta.')).toBeInTheDocument();
      });
    });

    it('hides form when status is answered and providerResponse is present', async () => {
      const data = {
        ...mockData,
        complaint: { ...mockData.complaint, status: 'answered' as const },
        providerResponse: {
          responseText: 'Respuesta',
          actionsTaken: null,
          respondedAt: '2026-08-15T10:00:00Z',
          responseChannel: 'email'
        }
      };
      (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => data });
      render(<AdminComplaintDetail complaintId="123" canRespond={true} />);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Registrar respuesta/i })).not.toBeInTheDocument();
        expect(screen.getByText('Respuesta')).toBeInTheDocument();
      });
    });

    it('hides form when status is closed', async () => {
      const data = { ...mockData, complaint: { ...mockData.complaint, status: 'closed' as const } };
      (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => data });
      render(<AdminComplaintDetail complaintId="123" canRespond={true} />);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Registrar respuesta/i })).not.toBeInTheDocument();
        expect(screen.getByText('Aún no se ha registrado una respuesta.')).toBeInTheDocument();
      });
    });
  });

  describe('Information Requests section', () => {
    it('renders history rendering and empty history', async () => {
      (global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });
      render(<AdminComplaintDetail complaintId="123" canReview={false} />);
      await waitFor(() => {
        expect(screen.getByText('Solicitudes de Información')).toBeInTheDocument();
        expect(screen.getByText('No se han registrado solicitudes de información para esta denuncia.')).toBeInTheDocument();
      });
    });

    it('renders request form visibility under_review with canReview=true', async () => {
      const data = { ...mockData, complaint: { ...mockData.complaint, status: 'under_review' as const } };
      (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => data });
      render(<AdminComplaintDetail complaintId="123" canReview={true} />);
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Solicitar Información al Consumidor' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Solicitar Información' })).toBeInTheDocument();
      });
    });

    it('hides request form when canReview=false', async () => {
      const data = { ...mockData, complaint: { ...mockData.complaint, status: 'under_review' as const } };
      (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => data });
      render(<AdminComplaintDetail complaintId="123" canReview={false} />);
      await waitFor(() => {
        expect(screen.queryByText('Solicitar Información al Consumidor')).not.toBeInTheDocument();
      });
    });

    it('renders resume form visibility awaiting_information with openRequests cardinality', async () => {
      const data = {
        ...mockData,
        complaint: { ...mockData.complaint, status: 'awaiting_information' as const },
        informationRequests: [
          { requestSequence: 1, requestText: 'Req 1', requestedAt: '2026-08-11T10:00:00Z', status: 'open', returnNote: null, receivedAt: null }
        ]
      };
      (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => data });
      render(<AdminComplaintDetail complaintId="123" canReview={true} />);
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Reanudar Revisión' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reanudar Revisión' })).toBeInTheDocument();
      });
    });

    it('hides resume form if no open requests', async () => {
      const data = {
        ...mockData,
        complaint: { ...mockData.complaint, status: 'awaiting_information' as const },
        informationRequests: [
          { requestSequence: 1, requestText: 'Req 1', requestedAt: '2026-08-11T10:00:00Z', status: 'received', returnNote: 'Note 1', receivedAt: '2026-08-12T10:00:00Z' }
        ]
      };
      (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => data });
      render(<AdminComplaintDetail complaintId="123" canReview={true} />);
      await waitFor(() => {
        expect(screen.queryByText('Reanudar Revisión')).not.toBeInTheDocument();
      });
    });

    it('shows coexistence with canRespond in awaiting_information', async () => {
      const data = {
        ...mockData,
        complaint: { ...mockData.complaint, status: 'awaiting_information' as const },
        informationRequests: [
          { requestSequence: 1, requestText: 'Req 1', requestedAt: '2026-08-11T10:00:00Z', status: 'open', returnNote: null, receivedAt: null }
        ]
      };
      (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => data });
      render(<AdminComplaintDetail complaintId="123" canReview={true} canRespond={true} />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Reanudar Revisión' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Registrar respuesta' })).toBeInTheDocument();
      });
    });

    it('triggers canonical refetch after child mutation', async () => {
      const data = { ...mockData, complaint: { ...mockData.complaint, status: 'under_review' as const } };
      (global.fetch as Mock).mockResolvedValue({ ok: true, json: async () => data });
      render(<AdminComplaintDetail complaintId="123" canReview={true} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Solicitar Información' })).toBeInTheDocument();
      });

      const prevFetchCalls = (global.fetch as Mock).mock.calls.length;

      const textarea = screen.getByLabelText(/Motivo de la solicitud de información/i);
      fireEvent.change(textarea, { target: { value: 'Necesito más pruebas.' } });

      const button = screen.getByRole('button', { name: 'Solicitar Información' });
      fireEvent.click(button);

      await waitFor(() => {
        expect((global.fetch as Mock).mock.calls.length).toBeGreaterThan(prevFetchCalls + 1);
      });
    });
  });

  describe('Close Complaint Action visibility', () => {
    it('shows close action when canReview=true and status=answered', async () => {
      const data = { ...mockData, complaint: { ...mockData.complaint, status: 'answered' as const } };
      (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => data });
      render(<AdminComplaintDetail complaintId="123" canReview={true} />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cerrar reclamo' })).toBeInTheDocument();
      });
    });

    it('hides close action when canReview=false and status=answered', async () => {
      const data = { ...mockData, complaint: { ...mockData.complaint, status: 'answered' as const } };
      (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => data });
      render(<AdminComplaintDetail complaintId="123" canReview={false} />);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Cerrar reclamo' })).not.toBeInTheDocument();
      });
    });

    it('hides close action when canReview=true and status!=answered', async () => {
      const data = { ...mockData, complaint: { ...mockData.complaint, status: 'closed' as const } };
      (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: async () => data });
      render(<AdminComplaintDetail complaintId="123" canReview={true} />);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Cerrar reclamo' })).not.toBeInTheDocument();
      });
    });
  });
});
