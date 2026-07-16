import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { doctors } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
  }

  const doctor = db
    .select({
      id: doctors.id,
      fullName: doctors.fullName,
      email: doctors.email,
      specialty: doctors.specialty,
      department: doctors.department,
    })
    .from(doctors)
    .where(eq(doctors.id, session.doctorId))
    .get();

  if (!doctor) {
    return NextResponse.json({ error: "Врач не найден" }, { status: 404 });
  }

  return NextResponse.json(doctor);
}
