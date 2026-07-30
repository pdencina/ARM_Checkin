import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();
    const validPin = (process.env.PLAY_PIN || "1234").trim();
    const inputPin = String(pin).trim();

    if (inputPin === validPin) {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ valid: false }, { status: 401 });
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
}
