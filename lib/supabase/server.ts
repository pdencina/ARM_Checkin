/* Mock Supabase server client for demo (no real DB) */
import { createClient as createBrowserClient } from "./client";

export function createClient() {
  // Re-use the same mock logic as the browser client
  return createBrowserClient();
}
