import { requireModule } from "@/lib/access";
import CheckoutClient from "./CheckoutClient";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  await requireModule("checkout", true);
  return <CheckoutClient />;
}
