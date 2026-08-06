import { ComplaintSheetNumber, ComplaintPrivateToken } from "./complaint.types";

export function formatComplaintSheetNumber(params: { year: number; sequence: number }): ComplaintSheetNumber {
  if (params.year < 2000 || params.year > 2100 || !Number.isInteger(params.year)) {
    throw new Error("Año inválido para hoja de reclamación");
  }
  if (params.sequence <= 0 || !Number.isInteger(params.sequence)) {
    throw new Error("Secuencia inválida para hoja de reclamación");
  }

  const paddedSequence = params.sequence.toString().padStart(6, "0");
  return `LR-${params.year}-${paddedSequence}`;
}

export function createComplaintPrivateToken(randomBytes: Uint8Array): ComplaintPrivateToken {
  // Use a base-62 like alphabet avoiding ambiguous characters (0, O, I, l)
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const alphabetLength = alphabet.length;
  const acceptanceLimit = Math.floor(256 / alphabetLength) * alphabetLength;

  let token = "";
  for (let i = 0; i < randomBytes.length; i++) {
    if (token.length === 12) break;
    const byte = randomBytes[i]!;
    if (byte < acceptanceLimit) {
      token += alphabet[byte % alphabetLength];
    }
  }

  if (token.length < 12) {
    throw new Error("Entropía insuficiente para generar el token");
  }

  return token;
}
