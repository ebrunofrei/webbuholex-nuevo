'use client';

import { useState, useRef } from 'react';
import styles from './admin-complaint-detail.module.css';

interface AdminComplaintCloseActionProps {
  complaintId: string;
  onRefresh: () => void;
}

export function AdminComplaintCloseAction({ complaintId, onRefresh }: AdminComplaintCloseActionProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // lock against double submit
  const submitLock = useRef(false);

  const handleInitialClick = () => {
    setIsConfirming(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsConfirming(false);
    setError(null);
  };

  const handleConfirm = async () => {
    if (submitLock.current) return;
    
    submitLock.current = true;
    setIsPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/complaints/${complaintId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expectedCurrentStatus: 'answered' }),
      });

      if (!res.ok) {
        if (res.status === 409) {
          onRefresh(); // safe error, refresh to get latest state
          return;
        }
        
        if (res.status === 404) {
          // Release lock but let UI stay, safe error
          submitLock.current = false;
          setIsPending(false);
          setError('El reclamo no fue encontrado.');
          return;
        }

        submitLock.current = false;
        setIsPending(false);
        setError('Ocurrió un error al intentar cerrar el reclamo. Por favor, intenta nuevamente.');
        return;
      }

      // 200 OK
      // retain reconciliation lock, trigger refresh
      onRefresh();
    } catch {
      // network or 5xx
      submitLock.current = false;
      setIsPending(false);
      setError('Error de conexión. Por favor, revisa tu conexión e intenta nuevamente.');
    }
  };

  if (!isConfirming) {
    return (
      <div className={styles.reviewActionContainer}>
        <button
          type="button"
          onClick={handleInitialClick}
          className={styles.primaryButton}
        >
          Cerrar reclamo
        </button>
      </div>
    );
  }

  return (
    <div className={styles.reviewActionContainer}>
      <p style={{ marginBottom: '1rem', color: '#374151' }}>
        Esta acción cerrará administrativamente el reclamo.
        El cierre no registra una nueva respuesta al consumidor.
      </p>
      
      {error && (
        <div className={styles.reviewActionError} role="alert">
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isPending}
          className={styles.primaryButton}
        >
          {isPending ? 'Cerrando...' : 'Confirmar cierre'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isPending}
          className={styles.backLink}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
