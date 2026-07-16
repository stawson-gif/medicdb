import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { patients, doctors } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { generateTemplate } from "@/lib/templates";
import { z } from "zod";

const schema = z.object({
  patientId: z.number(),
  type: z.enum(["journal", "initial", "referral", "discharge", "custom"]),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const patient = db
      .select()
      .from(patients)
      .where(
        and(
          eq(patients.id, data.patientId),
          eq(patients.doctorId, session.doctorId)
        )
      )
      .get();

    if (!patient) {
      return NextResponse.json({ error: "Пациент не найден" }, { status: 404 });
    }

    const doctor = db
      .select()
      .from(doctors)
      .where(eq(doctors.id, session.doctorId))
      .get();

    if (!doctor) {
      return NextResponse.json({ error: "Врач не найден" }, { status: 404 });
    }

    const template = generateTemplate(data.type, {
      patientName: patient.fullName,
      birthDate: patient.birthDate,
      doctorName: doctor.fullName,
      specialty: doctor.specialty ?? "Врач",
      department: doctor.department ?? "Отделение",
      diagnosis: patient.diagnosis ?? "",
      date: new Date().toISOString(),
    });

    return NextResponse.json(template);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("Template generation error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
