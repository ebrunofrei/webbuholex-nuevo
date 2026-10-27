import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import cp from "node:child_process";

/**
 * Represents a single extracted page from a source PDF.
 */
export interface ExtractedPage {
  readonly pageNumber: number;
  readonly text: string;
  readonly charCount: number;
}

/**
 * Extracted canonical source document.
 *
 * Page Boundary Semantics:
 * - `officialFullText` is the canonical extracted textual representation of the official source PDF.
 * - The `--- [PÁGINA N] ---` headers are system-added deterministic provenance boundaries,
 *   NOT judicial language from the source document.
 * - Zero legal text rewriting is permitted: no OCR, no LLM cleanup, no hyphen repair, no spelling correction.
 */
export interface ExtractedSourceDocument {
  readonly fileName: string;
  readonly byteSize: number;
  readonly sha256: string;
  readonly pageCount: number;
  readonly officialFullText: string;
  readonly characterCount: number;
  readonly engine?: string | undefined;
}

export interface RawExtractionOutput {
  readonly pageCount: number;
  readonly pages: readonly {
    readonly pageNumber: number;
    readonly text: string;
    readonly charCount?: number | undefined;
  }[];
  readonly engine?: string | undefined;
}

function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isRawExtractionOutput(value: unknown): value is RawExtractionOutput {
  if (!isUnknownRecord(value)) return false;
  if (typeof value.pageCount !== "number" || value.pageCount <= 0) return false;
  if (!Array.isArray(value.pages)) return false;

  for (const item of value.pages) {
    if (!isUnknownRecord(item)) return false;
    if (typeof item.pageNumber !== "number" || item.pageNumber <= 0) return false;
    if (typeof item.text !== "string") return false;
    if (item.charCount !== undefined && typeof item.charCount !== "number") return false;
  }

  return true;
}

export function validatePdfSourceFile(filePath: string): {
  readonly resolvedPath: string;
  readonly fileName: string;
  readonly byteSize: number;
  readonly sha256: string;
  readonly buffer: Buffer;
} {
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    throw new Error("jurisprudence_source_document_missing_path: source document path must be provided");
  }

  const resolvedPath = path.resolve(filePath.trim());
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`jurisprudence_source_document_not_found: file does not exist at ${filePath}`);
  }

  const stat = fs.statSync(resolvedPath);
  if (!stat.isFile()) {
    throw new Error("jurisprudence_source_document_invalid: path is not a regular file");
  }

  const ext = path.extname(resolvedPath).toLowerCase();
  if (ext !== ".pdf") {
    throw new Error("jurisprudence_source_document_invalid: file must have .pdf extension");
  }

  if (stat.size === 0) {
    throw new Error("jurisprudence_source_document_invalid: file is empty");
  }

  const buffer = fs.readFileSync(resolvedPath);
  if (buffer.length < 5 || buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("jurisprudence_source_document_invalid: file does not have valid %PDF- header");
  }

  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex").toLowerCase();
  const fileName = path.basename(resolvedPath);

  return {
    resolvedPath,
    fileName,
    byteSize: stat.size,
    sha256,
    buffer,
  };
}

export function extractPdfTextWithPython(resolvedPath: string): RawExtractionOutput {
  const scriptPath = path.resolve(process.cwd(), "scripts/extract-pdf-text.py");
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`jurisprudence_source_document_extraction_failed: extraction script not found at ${scriptPath}`);
  }

  let stdoutText: string;
  try {
    stdoutText = cp.execFileSync("python", [scriptPath, resolvedPath], {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      timeout: 60_000,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
      },
    });
  } catch (error: unknown) {
    if (isUnknownRecord(error) && error.code === "ENOENT") {
      throw new Error(
        "jurisprudence_python_runtime_missing: Python executable ('python') was not found in PATH. " +
        "Python 3.10+ (tested: 3.13.15) with pypdfium2==4.30.0 is required for canonical PDF extraction."
      );
    }
    const stderr = isUnknownRecord(error) && typeof error.stderr === "string" ? error.stderr : "";
    if (stderr.includes("CANONICAL_PDF_ENGINE_UNAVAILABLE")) {
      throw new Error(
        `jurisprudence_canonical_engine_unavailable: ${stderr.trim()}`
      );
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`jurisprudence_source_document_extraction_failed: python extractor exited with error: ${stderr || message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdoutText);
  } catch {
    throw new Error("jurisprudence_source_document_extraction_failed: invalid JSON from extractor");
  }

  if (!isRawExtractionOutput(parsed)) {
    throw new Error("jurisprudence_source_document_extraction_failed: extractor output failed schema validation");
  }

  return parsed;
}

export interface PdfExtractionOptions {
  readonly customExtractor?: ((resolvedPath: string) => RawExtractionOutput) | undefined;
}

/**
 * Validates the physical source PDF file, invokes the canonical extraction engine,
 * applies deterministic normalization (NFC, \\n, stripped control chars),
 * and wraps pages in system-added deterministic provenance boundaries: `--- [PÁGINA N] ---`.
 *
 * NOTE: The page markers are system-added deterministic provenance boundaries,
 * NOT judicial language authored by the issuing court.
 */
export function validateAndExtractPdfSourceDocument(
  filePath: string,
  options?: PdfExtractionOptions | undefined
): ExtractedSourceDocument {
  const validation = validatePdfSourceFile(filePath);

  const extractor = options?.customExtractor ?? extractPdfTextWithPython;
  const rawOutput = extractor(validation.resolvedPath);

  if (rawOutput.pageCount <= 0 || rawOutput.pages.length === 0) {
    throw new Error("jurisprudence_source_document_invalid: no pages found in PDF");
  }

  let totalCharsWithoutHeaders = 0;
  const pageSegments: string[] = [];

  for (const page of rawOutput.pages) {
    const normalizedPageText = page.text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
      .normalize("NFC")
      .trim();

    totalCharsWithoutHeaders += normalizedPageText.length;
    pageSegments.push(`--- [PÁGINA ${page.pageNumber}] ---\n${normalizedPageText}`);
  }

  if (totalCharsWithoutHeaders === 0) {
    throw new Error("jurisprudence_source_document_text_layer_missing: no text layer found in PDF (OCR not permitted)");
  }

  const officialFullText = pageSegments.join("\n\n");

  return {
    fileName: validation.fileName,
    byteSize: validation.byteSize,
    sha256: validation.sha256,
    pageCount: rawOutput.pageCount,
    officialFullText,
    characterCount: officialFullText.length,
    engine: rawOutput.engine,
  };
}
