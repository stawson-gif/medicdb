import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { eq, desc, like, or, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  fullName: z.string().min(2),
  birthDate: z.string(),
  gender: z.enum(["male", "female"]),
  address: z.string().optional(),
  phone: z.string().optional(),
  insuranceNumber: z.string().optional(),
  diagnosis: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get("search") ?? "";

  const where = search
    ? and(
        eq(patients.doctorId, session.doctorId),
        or(
          like(patients.fullName, `%${search}%`),
          like(patients.diagnosis, `%${search}%`)
        )
      )
    : eq(patients.doctorId, session.doctorId);

  const results = db
    .select()
    .from(patients)
    .where(where)
    .orderBy(desc(patients.updatedAt))
    .all();

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const patient = db
      .insert(patients)
      .values({
        fullName: data.fullName,
        birthDate: data.birthDate,
        gender: data.gender,
        address: data.address ?? null,
        phone: data.phone ?? null,
        insuranceNumber: data.insuranceNumber ?? null,
        diagnosis: data.diagnosis ?? null,
        doctorId: session.doctorId,
      })
      .returning()
      .get();

    return NextResponse.json(patient, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("Create patient error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
