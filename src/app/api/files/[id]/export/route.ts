import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import HTMLtoDOCX from "html-to-docx";
import { db } from "@/db";
import { patientFiles } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { attachmentDisposition, cleanEditorHtml } from "@/lib/file-storage";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const file = db
    .select()
    .from(patientFiles)
    .where(
      and(
        eq(patientFiles.id, Number(id)),
        eq(patientFiles.doctorId, session.doctorId)
      )
    )
    .get();

  if (!file) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }
  if (file.editableContent === null) {
    return NextResponse.json(
      { error: "Для этого файла нет редактируемой версии" },
      { status: 400 }
    );
  }

  try {
    const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"></head><body>${cleanEditorHtml(file.editableContent)}</body></html>`;
    const result = await HTMLtoDOCX(html, null, {
      orientation: "portrait",
      pageSize: { width: 11906, height: 16838 },
      margins: { top: 1134, right: 850, bottom: 1134, left: 1701 },
      title: file.originalName,
      creator: session.fullName,
      font: "Times New Roman",
      fontSize: 24,
      lang: "ru-RU",
    });
    const buffer = Buffer.isBuffer(result)
      ? result
      : Buffer.from(await result.arrayBuffer());

    const baseName = path.basename(
      file.originalName,
      path.extname(file.originalName)
    );
    const outputName = `${baseName} — редакция.docx`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Length": String(buffer.length),
        "Content-Disposition": attachmentDisposition(
          outputName,
          `edited-file-${file.id}.docx`
        ),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("DOCX export error:", error);
    return NextResponse.json(
      { error: "Не удалось сформировать Word-файл" },
      { status: 500 }
    );
  }
}
