import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { guardianId, credential } = await req.json();

  if (!guardianId || !credential) {
    return NextResponse.json({ valid: false });
  }

  // Demo mode: always valid
  return NextResponse.json({ valid: true });
}
