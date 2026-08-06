export function normalizeComplaintText(text: string): string {
  if (!text) return "";
  return removeDisallowedControlCharacters(normalizeLineBreaks(text)).trim();
}

export function normalizePersonName(name: string): string {
  if (!name) return "";
  return name.replace(/\s+/g, " ").trim();
}

export function normalizeEmail(email: string): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  if (!phone) return "";
  return phone.replace(/[^\d+()\-]/g, "");
}

export function normalizeDocumentNumber(doc: string): string {
  if (!doc) return "";
  return doc.replace(/\s+/g, "").trim().toUpperCase();
}

export function normalizeLineBreaks(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function removeDisallowedControlCharacters(text: string): string {
  return text.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, "");
}
