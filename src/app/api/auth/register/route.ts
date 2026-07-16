import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/db";
import { doctors } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createToken, setSessionCookie } from "@/lib/auth";

const schema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  specialty: z.string().optional(),
  department: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const existing = db
      .select()
      .from(doctors)
      .where(eq(doctors.email, data.email))
      .all();

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Врач с таким email уже зарегистрирован" },
        { status: 400 }
      );
    }

    const passwordHash = await hash(data.password, 12);

    const doctor = db
      .insert(doctors)
      .values({
        fullName: data.fullName,
        email: data.email,
        passwordHash,
        specialty: data.specialty ?? null,
        department: data.department ?? null,
      })
      .returning()
      .get();

    const token = await createToken({
      doctorId: doctor.id,
      email: doctor.email,
      fullName: doctor.fullName,
    });

    await setSessionCookie(token);

    return NextResponse.json({
      id: doctor.id,
      fullName: doctor.fullName,
      email: doctor.email,
      specialty: doctor.specialty,
      department: doctor.department,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues }, { status: 400 });
    }
    console.error("Register error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
