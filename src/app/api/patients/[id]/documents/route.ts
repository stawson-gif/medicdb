import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { documents, patients } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  type: z.enum(["journal", "initial", "referral", "discharge", "custom"]),
  title: z.string().min(1),
  content: z.string(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const { id } = await params;

  const patient = db
    .select()
    .from(patients)
    .where(
      and(eq(patients.id, Number(id)), eq(patients.doctorId, session.doctorId))
    )
    .get();

  if (!patient) {
    return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
  }

  const docs = db
    .select()
    .from(documents)
    .where(eq(documents.patientId, Number(id)))
    .orderBy(desc(documents.updatedAt))
    .all();

  return NextResponse.json(docs);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const data = createSchema.parse(body);

    const patient = db
      .select()
      .from(patients)
      .where(
        and(eq(patients.id, Number(id)), eq(patients.doctorId, session.doctorId))
      )
      .get();

    if (!patient) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    const doc = db
      .insert(documents)
      .values({
        patientId: Number(id),
        doctorId: session.doctorId,
        type: data.type,
        title: data.title,
        content: data.content,
      })
      .returning()
      .get();

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("Create document error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
