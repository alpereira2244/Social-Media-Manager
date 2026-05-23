import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

const maxFileSize = 8 * 1024 * 1024;
const textExtensions = [".txt", ".md", ".markdown", ".transcript", ".vtt", ".srt"];

function extensionFromName(filename: string) {
  const lower = filename.toLowerCase();
  const dotIndex = lower.lastIndexOf(".");
  return dotIndex >= 0 ? lower.slice(dotIndex) : "";
}

function cleanTranscriptText(value: string) {
  return value
    .replace(/WEBVTT/gi, " ")
    .replace(/\d{2}:\d{2}:\d{2}[,\.]\d{3}\s+-->\s+\d{2}:\d{2}:\d{2}[,\.]\d{3}/g, " ")
    .replace(/^\d+\s*$/gm, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeText(buffer: ArrayBuffer) {
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

function roughPdfText(buffer: ArrayBuffer) {
  const binary = new TextDecoder("latin1", { fatal: false }).decode(buffer);
  const chunks = Array.from(binary.matchAll(/\(([^()]{8,})\)\s*Tj/g))
    .map((match) => match[1])
    .join(" ");
  return chunks
    .replace(/\\\)/g, ")")
    .replace(/\\\(/g, "(")
    .replace(/\\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Upload a document file first." }, { status: 400 });
  }

  if (file.size > maxFileSize) {
    return NextResponse.json(
      { error: "This file is too large. Upload files under 8MB for now." },
      { status: 413 }
    );
  }

  const filename = file.name || "uploaded-document";
  const extension = extensionFromName(filename);
  const buffer = await file.arrayBuffer();
  let text = "";

  if (textExtensions.includes(extension) || file.type.startsWith("text/")) {
    text = cleanTranscriptText(decodeText(buffer));
  } else if (extension === ".pdf" || file.type === "application/pdf") {
    text = roughPdfText(buffer);
    if (!text || text.split(/\s+/).filter(Boolean).length < 30) {
      return NextResponse.json(
        {
          error:
            "PDF text extraction was not readable for this file. Paste the text manually for now."
        },
        { status: 422 }
      );
    }
  } else if (
    extension === ".docx" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return NextResponse.json(
      {
        error:
          "DOCX upload is recognized, but DOCX text extraction needs a document parser. Export as .txt or paste the content for now."
      },
      { status: 415 }
    );
  } else {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Upload .txt, .md, transcript text, or a text-readable PDF."
      },
      { status: 415 }
    );
  }

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 10) {
    return NextResponse.json(
      { error: "The document did not contain enough readable text." },
      { status: 422 }
    );
  }

  return NextResponse.json({
    filename,
    file_type: file.type || extension || "unknown",
    text,
    extracted_text_length: text.length,
    uploaded_at: new Date().toISOString()
  });
}
