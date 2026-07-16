import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { db } from "@/db";
import { doctors } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createToken, setSessionCookie } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const doctor = db
      .select()
      .from(doctors)
      .where(eq(doctors.email, data.email))
      .get();

    if (!doctor) {
      return NextResponse.json(
        { error: "Неверный email или пароль" },
        { status: 401 }
      );
    }

    const valid = await compare(data.password, doctor.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Неверный email или пароль" },
        { status: 401 }
      );
    }

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
    console.error("Login error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
