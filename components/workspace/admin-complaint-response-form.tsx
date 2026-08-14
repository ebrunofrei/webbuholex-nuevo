'use client';

import { useState, useRef, useEffect } from 'react';
import { ProviderResponseHttpSchema } from '@/lib/complaints/provider-response.contract';
import styles from './admin-complaint-response-form.module.css';

interface AdminComplaintResponseFormProps {
  complaintId: string;
  currentStatus: 'under_review' | 'awaiting_information';
  onRefresh: () => void;
}

export function AdminComplaintResponseForm({ complaintId, currentStatus, onRefresh }: AdminComplaintResponseFormProps) {
  const [responderName, setResponderName] = useState('');
  const [responderRole, setResponderRole] = useState('');
  const [responseText, setResponseText] = useState('');
  const [actionsTaken, setActionsTaken] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    responderName?: string;
    responderRole?: string;
    responseText?: string;
    actionsTaken?: string;
  }>({});

  const submitLockRef = useRef<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const validateForm = () => {
    const data = {
      expectedCurrentStatus: currentStatus,
      responseChannel: 'email',
      responderName,
      responderRole,
      responseText,
      actionsTaken: actionsTaken.trim() || undefined,
    };

    const parsed = ProviderResponseHttpSchema.safeParse(data);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach(issue => {
        const path = issue.path[0] as string;
        if (issue.code === 'too_small') {
          errors[path] = 'Este campo es obligatorio.';
        } else if (issue.code === 'too_big') {
          errors[path] = `Excede el límite permitido.`;
        } else {
          errors[path] = 'Campo inválido.';
        }
      });
      // Additional fallback for empty required strings not caught as 'too_small' if trim is applied
      if (!responderName.trim()) errors.responderName = 'Este campo es obligatorio.';
      if (!responderRole.trim()) errors.responderRole = 'Este campo es obligatorio.';
      if (!responseText.trim()) errors.responseText = 'Este campo es obligatorio.';

      setFieldErrors(errors);
      return false;
    }

    setFieldErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;

    setGlobalError(null);
    setSuccessMessage(null);

    if (!validateForm()) {
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);

    try {
      const payload = {
        expectedCurrentStatus: currentStatus,
        responseChannel: 'email',
        responderName: responderName.trim(),
        responderRole: responderRole.trim(),
        responseText: responseText.trim(),
        ...(actionsTaken.trim() ? { actionsTaken: actionsTaken.trim() } : {})
      };

      const res = await fetch(`/api/admin/complaints/${complaintId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!mountedRef.current) return;

      if (res.status === 201) {
        setSuccessMessage('Respuesta registrada correctamente.');
        onRefresh();
        // Do not release lock; wait for refetch to replace UI
        return;
      }

      if (res.status === 409) {
        setGlobalError('El reclamo cambió mientras preparabas la respuesta. Actualiza el detalle para continuar.');
        onRefresh();
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      if (res.status === 401) {
        setGlobalError('Tu sesión ha expirado. Inicia sesión nuevamente para continuar.');
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      if (res.status === 403) {
        setGlobalError('No tienes permisos para responder este reclamo.');
        // Do not release lock; permanently disable
        return;
      }

      if (res.status === 404) {
        onRefresh();
        // Do not release lock; wait for refetch to replace UI
        return;
      }

      if (res.status === 413) {
        setGlobalError('El contenido de la respuesta excede el tamaño permitido.');
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      if (res.status === 415) {
        setGlobalError('No se pudo registrar la respuesta.');
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      if (res.status === 422) {
        let json;
        try { json = await res.json(); } catch { /* ignore */ }
        const code = json?.error?.code;

        if (code === 'complaint_response_invalid_status') {
          setGlobalError('El estado del reclamo no permite emitir una respuesta.');
          onRefresh();
          // Do not release lock; wait for refetch
        } else {
          if (code === 'complaint_response_channel_invalid') {
            setGlobalError('Canal de respuesta no válido.');
          } else if (code === 'complaint_response_responder_required') {
            setGlobalError('El nombre y rol del responsable son obligatorios.');
          } else if (code === 'complaint_response_text_required') {
            setGlobalError('Debe ingresar el texto de la respuesta.');
          } else if (code === 'complaint_response_text_too_long') {
            setGlobalError('El texto de la respuesta excede el límite permitido.');
          } else if (code === 'complaint_response_actions_too_long') {
            setGlobalError('El texto de acciones excede el límite permitido.');
          } else {
            setGlobalError('No se pudo procesar la respuesta debido a un error de validación.');
          }
          submitLockRef.current = false;
          setIsSubmitting(false);
        }
        return;
      }

      if (res.status === 503) {
        setGlobalError('El servicio no está disponible temporalmente. Intenta de nuevo más tarde.');
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      if (res.status === 500) {
        setGlobalError('Ocurrió un error inesperado. Intenta de nuevo.');
        submitLockRef.current = false;
        setIsSubmitting(false);
        return;
      }

      // Malformed 200/201 or any other unhandled success/uncertain state
      setGlobalError('Resultado incierto. Verificando estado actualizado...');
      onRefresh();
      // Do not release lock; wait for refetch

    } catch {
      if (!mountedRef.current) return;
      setGlobalError('Ocurrió un error de conexión. Intenta de nuevo.');
      submitLockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <form onSubmit={handleSubmit} noValidate>
        <div aria-live="polite" className={styles.srOnly}>
          {globalError ? `Error: ${globalError}` : ''}
          {successMessage ? `Éxito: ${successMessage}` : ''}
        </div>

        {globalError && (
          <div className={styles.alertError} role="alert">
            {globalError}
          </div>
        )}

        {successMessage && (
          <div className={styles.alertSuccess} role="status">
            {successMessage}
          </div>
        )}

        <div className={styles.formGroup}>
          <label htmlFor="responderName" className={styles.label}>Nombre que figurará en la respuesta</label>
          <input
            id="responderName"
            name="responderName"
            type="text"
            className={`${styles.input} ${fieldErrors.responderName ? styles.inputError : ''}`}
            value={responderName}
            onChange={(e) => setResponderName(e.target.value)}
            disabled={isSubmitting}
            aria-describedby={`responderName-help ${fieldErrors.responderName ? 'responderName-error' : ''}`.trim()}
          />
          {fieldErrors.responderName && <span id="responderName-error" className={styles.errorMessage}>{fieldErrors.responderName}</span>}
          <span id="responderName-help" className={styles.helpText}>El nombre y el cargo ingresados aquí figurarán como datos del responsable en la respuesta registrada para el consumidor.</span>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="responderRole" className={styles.label}>Cargo que figurará en la respuesta</label>
          <input
            id="responderRole"
            name="responderRole"
            type="text"
            className={`${styles.input} ${fieldErrors.responderRole ? styles.inputError : ''}`}
            value={responderRole}
            onChange={(e) => setResponderRole(e.target.value)}
            disabled={isSubmitting}
            aria-describedby={fieldErrors.responderRole ? 'responderRole-error' : undefined}
          />
          {fieldErrors.responderRole && <span id="responderRole-error" className={styles.errorMessage}>{fieldErrors.responderRole}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="responseText" className={styles.label}>Respuesta al consumidor</label>
          <textarea
            id="responseText"
            name="responseText"
            className={`${styles.textarea} ${fieldErrors.responseText ? styles.textareaError : ''}`}
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            disabled={isSubmitting}
            aria-describedby={fieldErrors.responseText ? 'responseText-error' : undefined}
          />
          {fieldErrors.responseText && <span id="responseText-error" className={styles.errorMessage}>{fieldErrors.responseText}</span>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="actionsTaken" className={styles.label}>Acciones realizadas</label>
          <textarea
            id="actionsTaken"
            name="actionsTaken"
            className={`${styles.textarea} ${fieldErrors.actionsTaken ? styles.textareaError : ''}`}
            value={actionsTaken}
            onChange={(e) => setActionsTaken(e.target.value)}
            disabled={isSubmitting}
            aria-describedby={fieldErrors.actionsTaken ? 'actionsTaken-error' : undefined}
          />
          {fieldErrors.actionsTaken && <span id="actionsTaken-error" className={styles.errorMessage}>{fieldErrors.actionsTaken}</span>}
        </div>

        <div className={styles.formActions}>
          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Registrando respuesta...' : 'Registrar respuesta'}
          </button>
        </div>
      </form>
    </div>
  );
}
