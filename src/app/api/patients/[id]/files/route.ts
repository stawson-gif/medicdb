import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { patientFiles, patients } from "@/db/schema";
import { getSession } from "@/lib/auth";
import {
  docxToEditableHtml,
  isDocx,
  MAX_FILE_SIZE,
  removeStoredFile,
  saveUploadedFile,
} from "@/lib/file-storage";

export const runtime = "nodejs";

async function getOwnedPatient(patientId: number, doctorId: number) {
  return db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.doctorId, doctorId)))
    .get();
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const patientId = Number(id);
  if (!Number.isInteger(patientId)) {
    return NextResponse.json({ error: "Некорректный пациент" }, { status: 400 });
  }

  const patient = await getOwnedPatient(patientId, session.doctorId);
  if (!patient) {
    return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
  }

  const files = db
    .select({
      id: patientFiles.id,
      patientId: patientFiles.patientId,
      originalName: patientFiles.originalName,
      mimeType: patientFiles.mimeType,
      size: patientFiles.size,
      editableContent: patientFiles.editableContent,
      conversionWarnings: patientFiles.conversionWarnings,
      createdAt: patientFiles.createdAt,
      updatedAt: patientFiles.updatedAt,
    })
    .from(patientFiles)
    .where(
      and(
        eq(patientFiles.patientId, patientId),
        eq(patientFiles.doctorId, session.doctorId)
      )
    )
    .orderBy(desc(patientFiles.createdAt))
    .all()
    .map((file) => ({
      ...file,
      editable: file.editableContent !== null,
      editableContent: undefined,
      warningsCount: file.conversionWarnings
        ? JSON.parse(file.conversionWarnings).length
        : 0,
      conversionWarnings: undefined,
    }));

  return NextResponse.json(files);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const patientId = Number(id);
  if (!Number.isInteger(patientId)) {
    return NextResponse.json({ error: "Некорректный пациент" }, { status: 400 });
  }

  const patient = await getOwnedPatient(patientId, session.doctorId);
  if (!patient) {
    return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const upload = formData.get("file");

    if (!(upload instanceof File)) {
      return NextResponse.json({ error: "Файл не выбран" }, { status: 400 });
    }
    if (upload.size === 0) {
      return NextResponse.json({ error: "Файл пуст" }, { status: 400 });
    }
    if (upload.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Максимальный размер файла — 20 МБ" },
        { status: 413 }
      );
    }

    const buffer = Buffer.from(await upload.arrayBuffer());
    let editableContent: string | null = null;
    let warnings: string[] = [];

    if (isDocx(upload.name, upload.type)) {
      try {
        const converted = await docxToEditableHtml(buffer);
        editableContent = converted.html;
        warnings = converted.warnings;
      } catch (error) {
        console.error("DOCX conversion error:", error);
        warnings = [
          "Не удалось подготовить документ для редактора. Оригинал доступен для скачивания.",
        ];
      }
    }

    const stored = await saveUploadedFile(patientId, upload.name, buffer);

    try {
      const file = db
        .insert(patientFiles)
        .values({
          patientId,
          doctorId: session.doctorId,
          originalName: upload.name,
          storedName: stored.storedName,
          mimeType: upload.type || "application/octet-stream",
          size: upload.size,
          editableContent,
          conversionWarnings: warnings.length ? JSON.stringify(warnings) : null,
        })
        .returning()
        .get();

      return NextResponse.json(
        { ...file, editable: file.editableContent !== null },
        { status: 201 }
      );
    } catch (error) {
      await removeStoredFile(patientId, stored.storedName);
      throw error;
    }
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Не удалось загрузить файл" },
      { status: 500 }
    );
  }
}
