import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("rol").eq("id", user.id).single();
  const { data: role } = await supabase.from("roles").select("es_admin").eq("slug", profile?.rol ?? "").single();
  if (!role?.es_admin) return NextResponse.json({ error: "Sin permiso de administrador" }, { status: 403 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });

  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const body = await req.json();
  const { email, password, rol = "lider", campus_id } = body;
  if (!email || !password) return NextResponse.json({ error: "Email y contraseña requeridos." }, { status: 400 });

  const { data: newUser, error } = await adminClient.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const updates: any = {};
  if (rol !== "lider") updates.rol = rol;
  if (campus_id) updates.campus_id = campus_id;
  if (Object.keys(updates).length > 0) {
    await adminClient.from("profiles").update(updates).eq("id", newUser.user.id);
  }

  return NextResponse.json({ success: true, userId: newUser.user.id });
}
