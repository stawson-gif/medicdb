import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { patientFiles } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { cleanEditorHtml, removeStoredFile } from "@/lib/file-storage";

export const runtime = "nodejs";

const updateSchema = z.object({
  content: z.string().max(5_000_000),
});

function getOwnedFile(fileId: number, doctorId: number) {
  return db
    .select()
    .from(patientFiles)
    .where(
      and(eq(patientFiles.id, fileId), eq(patientFiles.doctorId, doctorId))
    )
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
  const file = getOwnedFile(Number(id), session.doctorId);
  if (!file) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }

  return NextResponse.json({
    id: file.id,
    patientId: file.patientId,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
    editable: file.editableContent !== null,
    editableContent: file.editableContent,
    warnings: file.conversionWarnings
      ? JSON.parse(file.conversionWarnings)
      : [],
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const fileId = Number(id);
    const existing = getOwnedFile(fileId, session.doctorId);

    if (!existing) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
    }
    if (existing.editableContent === null) {
      return NextResponse.json(
        { error: "Этот формат нельзя редактировать" },
        { status: 400 }
      );
    }

    const data = updateSchema.parse(await req.json());
    const updated = db
      .update(patientFiles)
      .set({
        editableContent: cleanEditorHtml(data.content),
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(patientFiles.id, fileId),
          eq(patientFiles.doctorId, session.doctorId)
        )
      )
      .returning()
      .get();

    return NextResponse.json({
      id: updated.id,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Update file error:", error);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;
  const file = getOwnedFile(Number(id), session.doctorId);
  if (!file) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 });
  }

  await removeStoredFile(file.patientId, file.storedName);
  db.delete(patientFiles)
    .where(
      and(
        eq(patientFiles.id, file.id),
        eq(patientFiles.doctorId, session.doctorId)
      )
    )
    .run();

  return NextResponse.json({ ok: true });
}
