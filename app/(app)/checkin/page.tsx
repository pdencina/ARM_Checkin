import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/access";
import CheckinStation from "./CheckinStation";

export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  await requireModule("checkin", true);
  const supabase = createClient();
  const { data: servicios } = await supabase
    .from("services")
    .select("*")
    .eq("activo", true)
    .order("fecha", { ascending: false });

  return <CheckinStation servicios={servicios ?? []} />;
}
