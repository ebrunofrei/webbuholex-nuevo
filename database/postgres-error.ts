export interface PostgresDiagnosticMetadata {
  code?: string;
  severity?: string;
  routine?: string;
  constraint_name?: string;
  message?: string;
}

export function findPostgresDiagnosticError(
  error: unknown,
  depth: number = 0
): PostgresDiagnosticMetadata | null {
  if (depth > 5 || typeof error !== "object" || error === null) {
    return null;
  }

  let codeVal: string | undefined;
  let severityVal: string | undefined;
  let routineVal: string | undefined;
  let constraintVal: string | undefined;
  let messageVal: string | undefined;
  let errorName: string | undefined;

  if ("name" in error && typeof error.name === "string") {
    errorName = error.name;
  }

  if ("code" in error && typeof error.code === "string") {
    codeVal = error.code;
  }

  if ("severity" in error && typeof error.severity === "string") {
    severityVal = error.severity;
  }

  if ("routine" in error && typeof error.routine === "string") {
    routineVal = error.routine;
  }

  if ("constraint_name" in error && typeof error.constraint_name === "string") {
    constraintVal = error.constraint_name;
  }

  if ("message" in error && typeof error.message === "string") {
    messageVal = error.message;
  }

  const hasPostgresContext = errorName === "PostgresError" || severityVal !== undefined || routineVal !== undefined;

  let matches = false;

  if (codeVal !== undefined && /^[0-9A-Z]{5}$/.test(codeVal) && hasPostgresContext) {
    matches = true;
  }

  if (codeVal !== undefined && (codeVal.startsWith("ECONN") || codeVal === "ENOTFOUND" || codeVal === "EHOSTUNREACH")) {
    matches = true;
  }

  if (matches) {
    const result: PostgresDiagnosticMetadata = {};
    if (codeVal !== undefined) result.code = codeVal;
    if (severityVal !== undefined) result.severity = severityVal;
    if (routineVal !== undefined) result.routine = routineVal;
    if (constraintVal !== undefined) result.constraint_name = constraintVal;
    if (messageVal !== undefined) result.message = messageVal;
    return result;
  }

  if ("cause" in error && error.cause !== undefined) {
    return findPostgresDiagnosticError(error.cause, depth + 1);
  }

  return null;
}
