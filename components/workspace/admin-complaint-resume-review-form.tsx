import React, { useState, useRef } from 'react';
import styles from './admin-complaint-resume-review-form.module.css';

interface Props {
  complaintId: string;
  onRefresh: () => void;
}

export function AdminComplaintResumeReviewForm({ complaintId, onRefresh }: Props) {
  const [returnNote, setReturnNote] = useState('');
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
      const response = await fetch(`/api/admin/complaints/${complaintId}/resume-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedCurrentStatus: 'awaiting_information',
          returnNote: returnNote.trim(),
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
        } else if (data.code === 'complaint_no_open_information_request') {
          message = 'No hay una solicitud de información pendiente.';
        } else if (data.code === 'complaint_multiple_open_information_requests') {
          message = 'Múltiples solicitudes pendientes encontradas.';
        }
        setError(message);
        onRefresh();
        return;
      }

      if (response.status === 422) {
        const data = await response.json();
        let message = 'Error de validación.';
        if (data.code === 'complaint_resume_review_note_required') {
          message = 'La nota de respuesta es obligatoria.';
        } else if (data.code === 'complaint_resume_review_note_too_long') {
          message = 'La nota de respuesta es demasiado larga.';
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

      setError('Ocurrió un error inesperado al procesar la reanudación.');
      setPending(false);
      submitLockRef.current = false;
    } catch {
      setError('Error de conexión.');
      setPending(false);
      submitLockRef.current = false;
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label="Reanudar Revisión">
      <div className={styles.field}>
        <label htmlFor="returnNote" className={styles.label}>
          Nota de reanudación
        </label>
        <textarea
          id="returnNote"
          className={styles.textarea}
          value={returnNote}
          onChange={(e) => setReturnNote(e.target.value)}
          disabled={pending}
          required
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={pending || !returnNote.trim()}>
          {pending ? 'Reanudando...' : 'Reanudar Revisión'}
        </button>
      </div>
    </form>
  );
}
