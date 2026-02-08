import { extractTextByType } from "../files/extractTextByType.js";

export async function extractOCR(buffer, filename, mimetype) {
  const text = await extractTextByType(buffer, filename, mimetype);

  if (!text || text.trim().length < 10) {
    return "";
  }

  return text;
}
