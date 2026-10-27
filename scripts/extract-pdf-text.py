#!/usr/bin/env python3
"""
Canonical PDF Text Extraction Tool for BúhoLex Jurisprudence Ingestion.
Offline, deterministic, zero legal text rewriting, zero LLM, zero OCR.

Canonical Engine: pypdfium2==4.30.0 (pinned in requirements-jurisprudence.txt).
Fails closed if the canonical engine is unavailable.
"""
import sys
import os
import json
import re
import unicodedata

def clean_text(text: str) -> str:
    """
    Deterministic cleanup strictly conforming to Section 13 (No Legal Text Rewriting):
    - Normalize line endings to \n
    - Remove prohibited ASCII control characters except \t and \n
    - Apply Unicode NFC normalization
    - Trim leading/trailing page boundary whitespace
    No spelling correction, OCR correction, hyphen repair, citation correction, paraphrase, or summarization.
    """
    if not text:
        return ""
    # Normalize line breaks
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # Remove control characters except standard tabs (\x09) and newlines (\x0a)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", text)
    # Unicode NFC normalization
    text = unicodedata.normalize("NFC", text)
    return text.strip()

def extract_with_pypdfium(pdf_path: str):
    """
    Extracts text using the canonical pypdfium2 engine.
    Fails closed if pypdfium2 is missing or encounters unreadable structures.
    """
    try:
        import pypdfium2 as pdfium
    except ImportError as e:
        sys.stderr.write(
            "CANONICAL_PDF_ENGINE_UNAVAILABLE: Canonical extractor 'pypdfium2==4.30.0' is not installed.\n"
            f"Details: {str(e)}\n"
            "Action required: Install pinned dependencies using:\n"
            "  pip install -r requirements-jurisprudence.txt\n"
        )
        sys.exit(2)

    try:
        pdf = pdfium.PdfDocument(pdf_path)
    except Exception as e:
        sys.stderr.write(f"PDF_OPEN_ERROR: Failed to open PDF document: {str(e)}\n")
        sys.exit(1)

    page_count = len(pdf)
    pages = []
    for i in range(page_count):
        page = pdf[i]
        textpage = page.get_textpage()
        raw_text = textpage.get_text_bounded()
        cleaned = clean_text(raw_text)
        pages.append({
            "pageNumber": i + 1,
            "text": cleaned,
            "charCount": len(cleaned)
        })
    return {"pageCount": page_count, "pages": pages, "engine": "pypdfium2"}

def main():
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: python extract-pdf-text.py <path-to-pdf>\n")
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        sys.stderr.write(f"File not found: {pdf_path}\n")
        sys.exit(1)

    with open(pdf_path, "rb") as f:
        header = f.read(5)
        if header != b"%PDF-":
            sys.stderr.write("Invalid PDF: missing %PDF- header\n")
            sys.exit(1)

    # Reconfigure stdout for utf-8
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    result = extract_with_pypdfium(pdf_path)
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
