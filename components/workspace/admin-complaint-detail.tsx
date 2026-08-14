'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import styles from './admin-complaint-detail.module.css';

type ComplaintStatus = 'received' | 'under_review' | 'awaiting_information' | 'answered' | 'closed';

interface ConsumerData {
  consumerType: string;
  firstNames: string | null;
  lastNames: string | null;
  legalName: string | null;
  representative: {
    firstNames: string | null;
    lastNames: string | null;
    relationship: string | null;
    role: string | null;
  };
}

interface SubjectData {
  kind: string;
  description: string;
  amountApplicability: string;
  amount: string | null;
  currency: string | null;
  transactionDate: string | null;
  referenceNumber: string | null;
  channel: string | null;
}

interface ComplaintDetailsData {
  kind: string;
  facts: string;
  requestedResolution: string;
}

interface TimelineEntry {
  status: ComplaintStatus;
  changedAt: string;
}

interface ProviderResponseData {
  responseText: string | null;
  actionsTaken: string | null;
  respondedAt: string;
  responseChannel: string;
}

interface ComplaintData {
  id: string;
  sheetNumber: string;
  status: ComplaintStatus;
  submittedAt: string;
  deadlineAt: string;
  closedAt: string | null;
  consumer: ConsumerData;
  subject: SubjectData;
  details: ComplaintDetailsData;
}

interface AdminComplaintDetailResponse {
  complaint: ComplaintData;
  timeline: TimelineEntry[];
  providerResponse: ProviderResponseData | null;
}

interface AdminComplaintDetailProps {
  complaintId: string;
  canReview?: boolean;
}

type UIState =
  | { type: 'loading' }
  | { type: 'loaded'; data: AdminComplaintDetailResponse }
  | { type: 'error'; status: 401 | 403 | 404 | 500 | 503; message: string };

const STATUS_LABELS: Record<string, string> = {
  received: 'Recibido',
  under_review: 'En revisión',
  awaiting_information: 'Esperando información',
  answered: 'Respondido',
  closed: 'Cerrado',
};

const CONSUMER_TYPE_LABELS: Record<string, string> = {
  natural_person: 'Persona natural',
  legal_entity: 'Persona jurídica',
};

const SUBJECT_KIND_LABELS: Record<string, string> = {
  product: 'Producto',
  service: 'Servicio',
};

const COMPLAINT_KIND_LABELS: Record<string, string> = {
  complaint: 'Reclamo',
  claim: 'Queja',
};

const AMOUNT_APPLICABILITY_LABELS: Record<string, string> = {
  applicable: 'Sí',
  not_applicable: 'No',
  unknown: 'No', // or "Desconocido" but typically it means "No aplica"
};

const CHANNEL_LABELS: Record<string, string> = {
  website: 'Sitio web',
  whatsapp: 'WhatsApp',
  email: 'Correo electrónico',
  telephone: 'Teléfono',
  in_person: 'Presencial',
  other: 'Otro',
};

const REPRESENTATIVE_ROLE_LABELS: Record<string, string> = {
  father: 'Padre',
  mother: 'Madre',
  guardian: 'Tutor',
  legal_representative: 'Representante legal',
  other: 'Otro',
};

const getLabel = (map: Record<string, string>, value: string | null | undefined): string => {
  if (!value) return '';
  return map[value] || 'Valor no reconocido';
};

const getStatusLabel = (status: ComplaintStatus): string => {
  return STATUS_LABELS[status] || 'Estado desconocido';
};

const formatDate = (dateString: string) => {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
};

const formatDateTime = (dateString: string) => {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
};

import { AdminComplaintReviewAction } from './admin-complaint-review-action';

export function AdminComplaintDetail({ complaintId, canReview = false }: AdminComplaintDetailProps) {
  const [uiState, setUiState] = useState<UIState>({ type: 'loading' });
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef<boolean>(true);

  const fetchDetail = useCallback(async () => {
    if (!mountedRef.current) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setUiState({ type: 'loading' });

    try {
      const res = await fetch(`/api/admin/complaints/${complaintId}`, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
      });

      if (!mountedRef.current || controller.signal.aborted) return;

      if (!res.ok) {
        if (res.status === 401) {
          setUiState({ type: 'error', status: 401, message: 'Tu sesión ha expirado. Inicia sesión nuevamente para continuar.' });
        } else if (res.status === 403) {
          setUiState({ type: 'error', status: 403, message: 'No tienes permisos para ver este reclamo.' });
        } else if (res.status === 404) {
          setUiState({ type: 'error', status: 404, message: 'No encontramos este reclamo.' });
        } else if (res.status === 503) {
          setUiState({ type: 'error', status: 503, message: 'El servicio no está disponible temporalmente. Por favor, intenta de nuevo más tarde.' });
        } else {
          setUiState({ type: 'error', status: 500, message: 'Ocurrió un error inesperado. Por favor, intenta de nuevo.' });
        }
        return;
      }

      const data = await res.json();

      if (!mountedRef.current || controller.signal.aborted) return;

      if (!data || !data.complaint || !data.timeline || data.providerResponse === undefined) {
        setUiState({ type: 'error', status: 500, message: 'La respuesta del servidor no tiene el formato esperado.' });
        return;
      }

      setUiState({ type: 'loaded', data: data as AdminComplaintDetailResponse });
    } catch (err) {
      const errorObj = err as { name?: string };
      if (errorObj.name === 'AbortError') return;
      if (!mountedRef.current) return;

      setUiState({ type: 'error', status: 500, message: 'Ocurrió un error al cargar el detalle del reclamo.' });
    }
  }, [complaintId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchDetail();
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchDetail]);

  const handleRetry = () => {
    fetchDetail();
  };

  if (uiState.type === 'loading') {
    return (
      <div className={styles.container}>
        <div aria-live="polite" className={styles.srOnly}>Cargando detalle del reclamo...</div>
        <div className={styles.emptyState}>Cargando...</div>
      </div>
    );
  }

  if (uiState.type === 'error') {
    return (
      <div className={styles.container}>
        {uiState.status === 401 ? (
          <div className={styles.alertWarning} role="alert">
            <p>{uiState.message}</p>
            <button
              className={styles.primaryButton}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = `/api/auth/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
                }
              }}
            >
              Iniciar sesión
            </button>
          </div>
        ) : uiState.status === 404 ? (
          <div className={styles.alertInfo} role="alert">
            <p>{uiState.message}</p>
            <Link href="/app/reclamos" className={styles.primaryButton} style={{ display: 'inline-block', textDecoration: 'none' }}>
              Volver a reclamos
            </Link>
          </div>
        ) : uiState.status === 403 ? (
          <div className={styles.alertError} role="alert">
            <p>{uiState.message}</p>
            <Link href="/app/reclamos" className={styles.primaryButton} style={{ display: 'inline-block', textDecoration: 'none', marginTop: '1rem' }}>
              Volver a reclamos
            </Link>
          </div>
        ) : (
          <div className={styles.alertError} role="alert">
            <p>{uiState.message}</p>
            <button className={styles.retryButton} onClick={handleRetry}>
              Reintentar
            </button>
          </div>
        )}
      </div>
    );
  }

  const { complaint, timeline, providerResponse } = uiState.data;
  const hasRepresentative = complaint.consumer.representative && (
    complaint.consumer.representative.firstNames ||
    complaint.consumer.representative.lastNames ||
    complaint.consumer.representative.relationship ||
    complaint.consumer.representative.role
  );

  return (
    <div className={styles.container}>
      <div className={styles.backLinkContainer}>
        <Link href="/app/reclamos" className={styles.backLink}>
          ← Volver a reclamos
        </Link>
      </div>

      <div className={styles.header}>
        <div className={styles.headerTitleRow}>
          <h1 className={styles.title}>{complaint.sheetNumber}</h1>
          <span className={`${styles.statusBadge} ${styles[`status_${complaint.status}`]}`}>
            {getStatusLabel(complaint.status)}
          </span>
        </div>
        <AdminComplaintReviewAction
          complaintId={complaintId}
          currentStatus={complaint.status}
          canReview={canReview}
          onRefresh={fetchDetail}
        />
      </div>

      <div className={styles.grid}>
        <div className={styles.mainContent}>
          <section className={styles.section} aria-labelledby="section-fechas">
            <h2 id="section-fechas" className={styles.sectionTitle}>Resumen y Fechas</h2>
            <dl className={`${styles.dl} ${styles.twoCols}`}>
              <div>
                <dt className={styles.dt}>Fecha de envío</dt>
                <dd className={styles.dd}>{formatDateTime(complaint.submittedAt)}</dd>
              </div>
              <div>
                <dt className={styles.dt}>Fecha límite</dt>
                <dd className={styles.dd}>{formatDate(complaint.deadlineAt)}</dd>
              </div>
              {complaint.closedAt && (
                <div>
                  <dt className={styles.dt}>Fecha de cierre</dt>
                  <dd className={styles.dd}>{formatDateTime(complaint.closedAt)}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className={styles.section} aria-labelledby="section-consumidor">
            <h2 id="section-consumidor" className={styles.sectionTitle}>Consumidor</h2>
            <dl className={`${styles.dl} ${styles.twoCols}`}>
              <div>
                <dt className={styles.dt}>Tipo de consumidor</dt>
                <dd className={styles.dd}>{getLabel(CONSUMER_TYPE_LABELS, complaint.consumer.consumerType)}</dd>
              </div>
              {complaint.consumer.consumerType === 'natural_person' && (
                <>
                  {complaint.consumer.firstNames && (
                    <div>
                      <dt className={styles.dt}>Nombres</dt>
                      <dd className={styles.dd}>{complaint.consumer.firstNames}</dd>
                    </div>
                  )}
                  {complaint.consumer.lastNames && (
                    <div>
                      <dt className={styles.dt}>Apellidos</dt>
                      <dd className={styles.dd}>{complaint.consumer.lastNames}</dd>
                    </div>
                  )}
                </>
              )}
              {complaint.consumer.consumerType === 'legal_entity' && complaint.consumer.legalName && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt className={styles.dt}>Razón Social</dt>
                  <dd className={styles.dd}>{complaint.consumer.legalName}</dd>
                </div>
              )}
            </dl>

            {hasRepresentative && (
              <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                <h3 className={styles.dt} style={{ fontSize: '1rem', color: '#111827', marginBottom: '1rem' }}>Representante</h3>
                <dl className={`${styles.dl} ${styles.twoCols}`}>
                  {complaint.consumer.representative.firstNames && (
                    <div>
                      <dt className={styles.dt}>Nombres</dt>
                      <dd className={styles.dd}>{complaint.consumer.representative.firstNames}</dd>
                    </div>
                  )}
                  {complaint.consumer.representative.lastNames && (
                    <div>
                      <dt className={styles.dt}>Apellidos</dt>
                      <dd className={styles.dd}>{complaint.consumer.representative.lastNames}</dd>
                    </div>
                  )}
                  {complaint.consumer.representative.relationship && (
                    <div>
                      <dt className={styles.dt}>Relación</dt>
                      <dd className={styles.dd}>{getLabel(REPRESENTATIVE_ROLE_LABELS, complaint.consumer.representative.relationship)}</dd>
                    </div>
                  )}
                  {complaint.consumer.representative.role && (
                    <div>
                      <dt className={styles.dt}>Cargo</dt>
                      <dd className={styles.dd}>{complaint.consumer.representative.role}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </section>

          <section className={styles.section} aria-labelledby="section-asunto">
            <h2 id="section-asunto" className={styles.sectionTitle}>Bien o servicio (Asunto)</h2>
            <dl className={`${styles.dl} ${styles.twoCols}`}>
              <div>
                <dt className={styles.dt}>Tipo</dt>
                <dd className={styles.dd}>{getLabel(SUBJECT_KIND_LABELS, complaint.subject.kind)}</dd>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <dt className={styles.dt}>Descripción</dt>
                <dd className={styles.dd}>{complaint.subject.description}</dd>
              </div>
              {complaint.subject.amountApplicability && (
                <div>
                  <dt className={styles.dt}>Aplica Monto</dt>
                  <dd className={styles.dd}>{getLabel(AMOUNT_APPLICABILITY_LABELS, complaint.subject.amountApplicability)}</dd>
                </div>
              )}
              {complaint.subject.amount !== null && (
                <div>
                  <dt className={styles.dt}>Monto</dt>
                  <dd className={styles.dd}>{complaint.subject.currency ? `${complaint.subject.currency} ` : ''}{complaint.subject.amount}</dd>
                </div>
              )}
              {complaint.subject.transactionDate && (
                <div>
                  <dt className={styles.dt}>Fecha de transacción</dt>
                  <dd className={styles.dd}>{formatDate(complaint.subject.transactionDate)}</dd>
                </div>
              )}
              {complaint.subject.referenceNumber && (
                <div>
                  <dt className={styles.dt}>Número de referencia / Comprobante</dt>
                  <dd className={styles.dd}>{complaint.subject.referenceNumber}</dd>
                </div>
              )}
              {complaint.subject.channel && (
                <div>
                  <dt className={styles.dt}>Canal de adquisición</dt>
                  <dd className={styles.dd}>{getLabel(CHANNEL_LABELS, complaint.subject.channel)}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className={styles.section} aria-labelledby="section-reclamo">
            <h2 id="section-reclamo" className={styles.sectionTitle}>Reclamo</h2>
            <dl className={styles.dl}>
              <div>
                <dt className={styles.dt}>Tipo</dt>
                <dd className={styles.dd}>{getLabel(COMPLAINT_KIND_LABELS, complaint.details.kind)}</dd>
              </div>
              <div>
                <dt className={styles.dt}>Hechos</dt>
                <dd className={styles.textBlock}>{complaint.details.facts}</dd>
              </div>
              <div>
                <dt className={styles.dt}>Resolución solicitada</dt>
                <dd className={styles.textBlock}>{complaint.details.requestedResolution}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.section} aria-labelledby="section-respuesta">
            <h2 id="section-respuesta" className={styles.sectionTitle}>Respuesta del Proveedor</h2>
            {!providerResponse ? (
              <p className={styles.dd} style={{ color: '#6b7280' }}>Aún no se ha registrado una respuesta.</p>
            ) : (
              <dl className={styles.dl}>
                <div className={`${styles.dl} ${styles.twoCols}`} style={{ marginBottom: '1rem' }}>
                  <div>
                    <dt className={styles.dt}>Fecha de respuesta</dt>
                    <dd className={styles.dd}>{formatDateTime(providerResponse.respondedAt)}</dd>
                  </div>
                  <div>
                    <dt className={styles.dt}>Canal de respuesta</dt>
                    <dd className={styles.dd}>{getLabel(CHANNEL_LABELS, providerResponse.responseChannel)}</dd>
                  </div>
                </div>
                {providerResponse.responseText && (
                  <div>
                    <dt className={styles.dt}>Texto de respuesta</dt>
                    <dd className={styles.textBlock}>{providerResponse.responseText}</dd>
                  </div>
                )}
                {providerResponse.actionsTaken && (
                  <div>
                    <dt className={styles.dt}>Acciones tomadas</dt>
                    <dd className={styles.textBlock}>{providerResponse.actionsTaken}</dd>
                  </div>
                )}
              </dl>
            )}
          </section>
        </div>

        <div className={styles.sidebar}>
          <section className={styles.section} aria-labelledby="section-estado">
            <h2 id="section-estado" className={styles.sectionTitle}>Estado / Línea de tiempo</h2>
            <ul className={styles.timelineList}>
              {timeline.map((event, index) => (
                <li key={`${event.status}-${event.changedAt}-${index}`} className={styles.timelineItem}>
                  <div className={styles.timelineDot} aria-hidden="true"></div>
                  <div className={styles.timelineStatus}>{getStatusLabel(event.status)}</div>
                  <div className={styles.timelineDate}>{formatDateTime(event.changedAt)}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
