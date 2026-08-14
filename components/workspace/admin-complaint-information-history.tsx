import React from 'react';
import styles from './admin-complaint-information-history.module.css';

interface InformationRequestData {
  requestSequence: number;
  requestText: string;
  requestedAt: string;
  status: 'open' | 'received';
  returnNote: string | null;
  receivedAt: string | null;
}

interface Props {
  requests: InformationRequestData[];
}

export function AdminComplaintInformationHistory({ requests }: Props) {
  if (!requests || requests.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          No se han registrado solicitudes de información para esta denuncia.
        </div>
      </div>
    );
  }

  const sortedRequests = [...requests].sort((a, b) => a.requestSequence - b.requestSequence);

  return (
    <div className={styles.container}>
      {sortedRequests.map((req) => (
        <div key={req.requestSequence} className={styles.card}>
          <div className={styles.header}>
            <h4 className={styles.title}>Solicitud de Información #{req.requestSequence}</h4>
            <div className={styles.badges}>
              {req.status === 'open' && (
                <span className={`${styles.badge} ${styles.badgeOpen}`}>Pendiente</span>
              )}
              {req.status === 'received' && (
                <span className={`${styles.badge} ${styles.badgeReceived}`}>Recibida</span>
              )}
            </div>
          </div>

          <div className={styles.metadata}>
            <span>Solicitada: {new Date(req.requestedAt).toLocaleString()}</span>
            {req.receivedAt && (
              <span>Recibida: {new Date(req.receivedAt).toLocaleString()}</span>
            )}
          </div>

          <div className={styles.textSection}>
            <span className={styles.textLabel}>Motivo / Solicitud:</span>
            <p className={styles.textContent}>{req.requestText}</p>
          </div>

          {req.returnNote && (
            <div className={styles.textSection}>
              <span className={styles.textLabel}>Nota de respuesta:</span>
              <p className={styles.textContent}>{req.returnNote}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
