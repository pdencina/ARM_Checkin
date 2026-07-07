import { NextRequest, NextResponse } from "next/server";
import { MOCK_GUARDIANS } from "@/lib/mock-data";

export async function POST(req: NextRequest) {
  const { credential } = await req.json();
  if (!credential?.trim()) return NextResponse.json({ guardianId: null });

  const input = credential.trim().toLowerCase();
  const phone = input.replace(/[^0-9]/g, "");

  // Demo mode: search mock guardians
  const found = MOCK_GUARDIANS.find((g) =>
    g.email?.toLowerCase() === input ||
    (phone.length >= 7 && g.telefono?.includes(phone))
  );

  return NextResponse.json({ guardianId: found?.id ?? null });
}
