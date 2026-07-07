import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña requeridos." }, { status: 400 });
  }

  // Demo mode: pretend user was created
  return NextResponse.json({ success: true, userId: "demo-new-user-id" });
}
