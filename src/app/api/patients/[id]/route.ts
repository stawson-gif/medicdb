import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const updateSchema = z.object({
  fullName: z.string().min(2).optional(),
  birthDate: z.string().optional(),
  gender: z.enum(["male", "female"]).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  insuranceNumber: z.string().optional(),
  diagnosis: z.string().optional(),
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

  return NextResponse.json(patient);
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
    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.birthDate !== undefined) updateData.birthDate = data.birthDate;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.insuranceNumber !== undefined)
      updateData.insuranceNumber = data.insuranceNumber;
    if (data.diagnosis !== undefined) updateData.diagnosis = data.diagnosis;

    const updated = db
      .update(patients)
      .set(updateData)
      .where(
        and(eq(patients.id, Number(id)), eq(patients.doctorId, session.doctorId))
      )
      .returning()
      .get();

    if (!updated) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("Update patient error:", err);
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
  const deleted = db
    .delete(patients)
    .where(
      and(eq(patients.id, Number(id)), eq(patients.doctorId, session.doctorId))
    )
    .returning()
    .get();

  if (!deleted) {
    return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
