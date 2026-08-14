'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './admin-complaint-detail.module.css';

interface AdminComplaintReviewActionProps {
  complaintId: string;
  currentStatus: string;
  canReview: boolean;
  onRefresh: () => void;
}

export function AdminComplaintReviewAction({
  complaintId,
  currentStatus,
  canReview,
  onRefresh,
}: AdminComplaintReviewActionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  if (!canReview || currentStatus !== 'received' || isForbidden) {
    return null;
  }

  const handleReview = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/complaints/${complaintId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expectedCurrentStatus: 'received',
        }),
      });

      if (!mountedRef.current) return;

      if (!response.ok) {
        if (response.status === 409) {
          setError({ status: 409, message: 'El estado del reclamo cambió mientras lo revisabas.' });
          onRefresh();
        } else if (response.status === 401) {
          setError({ status: 401, message: 'Tu sesión ha expirado. Inicia sesión nuevamente para continuar.' });
        } else if (response.status === 403) {
          setIsForbidden(true);
          setError({ status: 403, message: 'No tienes permisos para realizar esta acción.' });
        } else if (response.status === 404) {
          onRefresh();
        } else if (response.status === 503) {
          setError({ status: 503, message: 'El servicio no está disponible temporalmente. Intenta de nuevo más tarde.' });
        } else if (response.status === 400 || response.status === 413 || response.status === 415) {
          setError({ status: response.status, message: 'No se pudo iniciar la revisión.' });
        } else {
          setError({ status: 500, message: 'Ocurrió un error inesperado. Intenta de nuevo.' });
        }
        setIsSubmitting(false);
        return;
      }

      // 200 Success
      try {
        await response.json();
        onRefresh();
      } catch {
        // malformed 200
        setError({ message: 'Ocurrió un error inesperado. Intenta de nuevo.' });
        onRefresh();
      }
    } catch {
      if (mountedRef.current) {
        setError({ message: 'Ocurrió un error inesperado. Intenta de nuevo.' });
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className={styles.reviewActionContainer}>
      <button
        type="button"
        className={styles.primaryButton}
        onClick={handleReview}
        disabled={isSubmitting}
        aria-disabled={isSubmitting}
      >
        {isSubmitting ? 'Iniciando revisión…' : 'Iniciar revisión'}
      </button>
      {error && (
        <div role="status" aria-live="polite" className={styles.reviewActionError}>
          {error.message}
        </div>
      )}
    </div>
  );
}
