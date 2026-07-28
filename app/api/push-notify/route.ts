import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { nombre, tipo } = await request.json();

    if (!nombre || !tipo) {
      return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
    }

    // Configurar VAPID en runtime (no a nivel módulo, para evitar error en build)
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json({ error: "VAPID keys no configuradas" }, { status: 500 });
    }
    webpush.setVapidDetails("mailto:play@armglobal.org", vapidPublic, vapidPrivate);

    // Crear cliente Supabase con service role para leer suscripciones
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} } }
    );

    // Obtener todas las suscripciones push
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    // Construir el payload
    const title = tipo === "llegada"
      ? "🧸 ¡Dejaron un niño!"
      : "👋 ¡Vienen a buscar!";
    const body = tipo === "llegada"
      ? `${nombre} está en recepción, anda a buscarlo`
      : `Vienen a buscar a ${nombre}, llévalo al hall`;

    const payload = JSON.stringify({
      title,
      body,
      tag: `play-${Date.now()}`,
      url: "/play",
    });

    // Enviar a todas las suscripciones
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
        } catch (err: any) {
          // Si la suscripción expiró o es inválida, eliminarla
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
          throw err;
        }
      })
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    return NextResponse.json({ sent });
  } catch (error: any) {
    console.error("Push error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
