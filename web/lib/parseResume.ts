import "server-only";

// Text extraction for uploaded résumés, used to feed lib/rankPostings.ts.
// PDF and plain text are supported; anything else (doc/docx, images) comes
// back as an empty string rather than throwing, since a failed extraction
// shouldn't block the upload itself -- see app/resume/actions.ts, which
// still saves the file either way and just skips ranking if this is empty.
export async function extractResumeText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    let parser: import("pdf-parse").PDFParse | undefined;
    try {
      const { PDFParse } = await import("pdf-parse");
      parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text.trim();
    } catch (err) {
      console.error("pdf text extraction failed:", err);
      return "";
    } finally {
      await parser?.destroy();
    }
  }

  if (mimeType === "text/plain") {
    return buffer.toString("utf-8").trim();
  }

  return "";
}
