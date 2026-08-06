export interface PublicError {
  code: string;
  httpStatus: number;
  publicMessageEs: string;
  retryable: boolean;
}

export const COMPLAINT_VALIDATION_FAILED: PublicError = {
  code: "complaint_validation_failed",
  httpStatus: 400,
  publicMessageEs: "Revisa los datos ingresados y corrige los campos señalados.",
  retryable: false,
};

export const COMPLAINT_SUBMISSION_FAILED: PublicError = {
  code: "complaint_submission_failed",
  httpStatus: 500,
  publicMessageEs: "No pudimos registrar tu reclamo o queja. Inténtalo nuevamente o comunícate con nuestro canal de atención.",
  retryable: true,
};

export const COMPLAINT_RATE_LIMITED: PublicError = {
  code: "complaint_rate_limited",
  httpStatus: 429,
  publicMessageEs: "No pudimos procesar el envío en este momento. Espera unos minutos e inténtalo nuevamente.",
  retryable: true,
};

export const COMPLAINT_DUPLICATE_SUBMISSION: PublicError = {
  code: "complaint_duplicate_submission",
  httpStatus: 409,
  publicMessageEs: "Esta solicitud ya fue registrada. Revisa la constancia mostrada o enviada a tu correo.",
  retryable: false,
};
