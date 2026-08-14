import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';
import { AdminComplaintInformationHistory } from '../components/workspace/admin-complaint-information-history';

describe('AdminComplaintInformationHistory', () => {
  it('renders empty state correctly', () => {
    render(<AdminComplaintInformationHistory requests={[]} />);
    expect(screen.getByText('No se han registrado solicitudes de información para esta denuncia.')).toBeInTheDocument();
  });

  it('renders history in requestSequence ASC order with safe fields only', () => {
    const requests = [
      {
        requestSequence: 2,
        requestText: 'Segunda solicitud larga que prueba el wrapping semántico del texto.',
        requestedAt: '2026-08-12T10:00:00Z',
        status: 'received' as const,
        returnNote: 'Nota de respuesta recibida.',
        receivedAt: '2026-08-13T10:00:00Z',
      },
      {
        requestSequence: 1,
        requestText: 'Primera solicitud',
        requestedAt: '2026-08-11T10:00:00Z',
        status: 'open' as const,
        returnNote: null,
        receivedAt: null,
      },
    ];

    render(<AdminComplaintInformationHistory requests={requests} />);

    // Check order
    const titles = screen.getAllByRole('heading', { level: 4 });
    expect(titles[0]).toHaveTextContent('Solicitud de Información #1');
    expect(titles[1]).toHaveTextContent('Solicitud de Información #2');

    // Check badges
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Recibida')).toBeInTheDocument();

    // Check text
    expect(screen.getByText('Primera solicitud')).toBeInTheDocument();
    expect(screen.getByText('Segunda solicitud larga que prueba el wrapping semántico del texto.')).toBeInTheDocument();

    // Check dates and notes
    expect(screen.getByText('Nota de respuesta recibida.')).toBeInTheDocument();

    const renderedText = document.body.textContent;
    expect(renderedText).toMatch(/11\/8\/2026/); // RequestedAt 1
    expect(renderedText).toMatch(/12\/8\/2026/); // RequestedAt 2
    expect(renderedText).toMatch(/13\/8\/2026/); // ReceivedAt 2
  });
});
