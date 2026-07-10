import { requireModule } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import LlamarClient from "./LlamarClient";

export const dynamic = "force-dynamic";

export default async function LlamarPage() {
  await requireModule("checkout");
  const supabase = createClient();
  
  const { data: servicios } = await supabase
    .from("services")
    .select("*")
    .eq("activo", true)
    .order("fecha", { ascending: false });

  return <LlamarClient servicios={servicios ?? []} />;
}
