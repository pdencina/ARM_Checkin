import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { guardianId, credential } = await req.json();

  if (!guardianId || !credential) {
    return NextResponse.json({ valid: false });
  }

  // Service role en el servidor — nunca llega al cliente
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const input = credential.trim().toLowerCase();

  const { data } = await supabase
    .from("guardians")
    .select("id")
    .eq("id", guardianId)
    .or(
      `email.ilike.${input},telefono.ilike.%${input.replace(/[^0-9]/g, "")}%`
    )
    .single();

  // Solo devuelve true/false — nunca datos del tutor
  return NextResponse.json({ valid: !!data });
}
