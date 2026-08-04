import { createBrowserClient } from "@supabase/ssr";

// For Client Components only. Uses the public URL + anon key, safe to
// expose to the browser -- access control is enforced by the RLS policies
// in supabase/schema.sql, not by keeping this client's credentials secret.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
