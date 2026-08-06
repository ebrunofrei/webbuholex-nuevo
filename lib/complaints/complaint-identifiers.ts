import { ComplaintSheetNumber } from "./complaint.types";

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

export type RandomBytesSource = (size: number) => Uint8Array;

export function createComplaintPrivateToken(randomBytes: RandomBytesSource): string {
  if (typeof randomBytes !== "function") {
    throw new Error("complaint_token_generation_failed");
  }

  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const alphabetLength = alphabet.length;
  const acceptanceLimit = Math.floor(256 / alphabetLength) * alphabetLength;
  const targetLength = 32;
  const blockSize = 40;
  const maxAttempts = 100;

  let token = "";
  let attempts = 0;

  while (token.length < targetLength && attempts < maxAttempts) {
    attempts++;
    let bytes: Uint8Array;
    try {
      bytes = randomBytes(blockSize);
    } catch {
      throw new Error("complaint_token_generation_failed");
    }

    if (!(bytes instanceof Uint8Array) || bytes.length !== blockSize) {
      throw new Error("complaint_token_generation_failed");
    }

    for (let i = 0; i < bytes.length; i++) {
      if (token.length === targetLength) break;
      const byte = bytes[i]!;
      if (byte < acceptanceLimit) {
        token += alphabet[byte % alphabetLength];
      }
    }
  }

  if (token.length < targetLength) {
    throw new Error("complaint_token_generation_failed");
  }

  return token;
}
