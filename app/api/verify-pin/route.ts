import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();
    const validPin = (process.env.PLAY_PIN || "2312").trim();
    const inputPin = String(pin || "").trim();

    console.log("[verify-pin] input:", inputPin, "expected:", validPin, "match:", inputPin === validPin);

    if (inputPin.length > 0 && inputPin === validPin) {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ valid: false, debug: { inputLen: inputPin.length, expectedLen: validPin.length } }, { status: 401 });
  } catch (e: any) {
    return NextResponse.json({ valid: false, error: e.message }, { status: 400 });
  }
}
