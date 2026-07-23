import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import mammoth from "mammoth";
import sanitizeHtml from "sanitize-html";

export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const defaultStorageRoot = path.join(process.cwd(), "data", "uploads");
const storageRoot = process.env.FILES_DIR
  ? path.resolve(/* turbopackIgnore: true */ process.env.FILES_DIR)
  : defaultStorageRoot;

export function isDocx(name: string, mimeType?: string): boolean {
  return (
    path.extname(name).toLowerCase() === ".docx" || mimeType === DOCX_MIME
  );
}

export function cleanEditorHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "del",
      "h1",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "hr",
      "mark",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "a",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      p: ["style"],
      h1: ["style"],
      h2: ["style"],
      h3: ["style"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedStyles: {
      "*": {
        "text-align": [/^(left|right|center|justify)$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
  });
}

export async function saveUploadedFile(
  patientId: number,
  originalName: string,
  data: Buffer
): Promise<{ storedName: string; absolutePath: string }> {
  const patientDirectory = path.join(storageRoot, String(patientId));
  await mkdir(patientDirectory, { recursive: true });

  const extension = path.extname(originalName).toLowerCase().slice(0, 16);
  const storedName = `${randomUUID()}${extension}`;
  const absolutePath = path.join(patientDirectory, storedName);
  await writeFile(absolutePath, data);

  return { storedName, absolutePath };
}

export function getStoredFilePath(patientId: number, storedName: string): string {
  const safeName = path.basename(storedName);
  return path.join(storageRoot, String(patientId), safeName);
}

export async function readStoredFile(
  patientId: number,
  storedName: string
): Promise<Buffer> {
  return readFile(getStoredFilePath(patientId, storedName));
}

export async function removeStoredFile(
  patientId: number,
  storedName: string
): Promise<void> {
  try {
    await unlink(getStoredFilePath(patientId, storedName));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") throw error;
  }
}

export async function docxToEditableHtml(
  buffer: Buffer
): Promise<{ html: string; warnings: string[] }> {
  const result = await mammoth.convertToHtml(
    { buffer },
    {
      styleMap: [
        "u => u",
        "strike => s",
        "p[style-name='Title'] => h1:fresh",
      ],
    }
  );

  return {
    html: cleanEditorHtml(result.value || "<p></p>"),
    warnings: result.messages.map((message) => message.message),
  };
}

export function safeDownloadName(name: string): string {
  return name.replace(/[\r\n"\\/]/g, "_").trim() || "file";
}

export function attachmentDisposition(
  originalName: string,
  asciiFallback: string
): string {
  const fallback = safeDownloadName(asciiFallback);
  const encoded = encodeURIComponent(originalName).replace(
    /['()*]/g,
    (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}
