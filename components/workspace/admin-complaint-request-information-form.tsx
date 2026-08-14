import React, { useState, useRef } from 'react';
import styles from './admin-complaint-request-information-form.module.css';

interface Props {
  complaintId: string;
  onRefresh: () => void;
}

export function AdminComplaintRequestInformationForm({ complaintId, onRefresh }: Props) {
  const [requestText, setRequestText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLockRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitLockRef.current) return;
    submitLockRef.current = true;

    setPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/complaints/${complaintId}/request-information`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedCurrentStatus: 'under_review',
          requestText: requestText.trim(),
        }),
      });

      if (response.ok) {
        onRefresh();
        return;
      }

      if (response.status === 409) {
        const data = await response.json();
        let message = 'Estado conflictivo de la denuncia.';
        if (data.code === 'complaint_stale_status') {
          message = 'El estado de la denuncia ha cambiado.';
        } else if (data.code === 'complaint_open_information_request_exists') {
          message = 'Ya existe una solicitud de información pendiente.';
        } else if (data.code === 'complaint_information_request_sequence_conflict') {
          message = 'Conflicto en la secuencia de solicitudes.';
        }
        setError(message);
        onRefresh();
        return;
      }

      if (response.status === 422) {
        const data = await response.json();
        let message = 'Error de validación.';
        if (data.code === 'complaint_request_information_text_required') {
          message = 'El texto de la solicitud es obligatorio.';
        } else if (data.code === 'complaint_request_information_text_too_long') {
          message = 'El texto de la solicitud es demasiado largo.';
        }
        setError(message);
        setPending(false);
        submitLockRef.current = false;
        return;
      }

      if (response.status === 404) {
        setError('Denuncia no encontrada.');
        setPending(false);
        submitLockRef.current = false;
        return;
      }

      setError('Ocurrió un error inesperado al procesar la solicitud.');
      setPending(false);
      submitLockRef.current = false;
    } catch {
      setError('Error de conexión.');
      setPending(false);
      submitLockRef.current = false;
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label="Solicitar Información">
      <div className={styles.field}>
        <label htmlFor="requestText" className={styles.label}>
          Motivo de la solicitud de información
        </label>
        <textarea
          id="requestText"
          className={styles.textarea}
          value={requestText}
          onChange={(e) => setRequestText(e.target.value)}
          disabled={pending}
          required
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={pending || !requestText.trim()}>
          {pending ? 'Procesando...' : 'Solicitar Información'}
        </button>
      </div>
    </form>
  );
}
