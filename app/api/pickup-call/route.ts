import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { guardian_id, service_id } = await req.json();

  if (!guardian_id || !service_id) {
    return NextResponse.json({ error: "guardian_id y service_id requeridos." }, { status: 400 });
  }

  const supabase = createClient();

  // Verify guardian exists
  const { data: guardian } = await supabase
    .from("guardians")
    .select("id, nombre, apellido")
    .eq("id", guardian_id)
    .single();

  if (!guardian) {
    return NextResponse.json({ error: "Familia no encontrada." }, { status: 404 });
  }

  // Create pickup call (uses RPC to avoid duplicates)
  const { data, error } = await supabase.rpc("do_pickup_call", {
    p_guardian_id: guardian_id,
    p_service_id: service_id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, call: data });
}

// GET: Get active calls for a service (used by the display screen)
export async function GET(req: NextRequest) {
  const serviceId = req.nextUrl.searchParams.get("service_id");
  
  if (!serviceId) {
    return NextResponse.json({ error: "service_id requerido." }, { status: 400 });
  }

  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("pickup_calls")
    .select(`
      id, estado, created_at,
      guardian:guardians(id, nombre, apellido, telefono)
    `)
    .eq("service_id", serviceId)
    .in("estado", ["pendiente", "en_camino"])
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Also get children for each guardian
  const guardianIds = (data ?? []).map((d: any) => d.guardian?.id).filter(Boolean);
  
  let childrenByGuardian: Record<string, any[]> = {};
  if (guardianIds.length > 0) {
    const { data: gcData } = await supabase
      .from("guardian_children")
      .select("guardian_id, child:children(id, nombre, apellido, ministerio)")
      .in("guardian_id", guardianIds);

    for (const gc of gcData ?? []) {
      if (!childrenByGuardian[gc.guardian_id]) childrenByGuardian[gc.guardian_id] = [];
      if ((gc as any).child) childrenByGuardian[gc.guardian_id].push((gc as any).child);
    }
  }

  const calls = (data ?? []).map((d: any) => ({
    ...d,
    children: childrenByGuardian[d.guardian?.id] ?? [],
  }));

  return NextResponse.json({ calls });
}
