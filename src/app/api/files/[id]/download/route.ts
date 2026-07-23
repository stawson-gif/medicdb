import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { patientFiles } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { attachmentDisposition, readStoredFile } from "@/lib/file-storage";

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

  try {
    const buffer = await readStoredFile(file.patientId, file.storedName);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Length": String(buffer.length),
        "Content-Disposition": attachmentDisposition(
          file.originalName,
          `file-${file.id}`
        ),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Download file error:", error);
    return NextResponse.json(
      { error: "Файл отсутствует в хранилище" },
      { status: 404 }
    );
  }
}
