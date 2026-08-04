import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// For Server Components, Server Actions, and Route Handlers. Reads/writes
// the session via cookies rather than localStorage, which is what makes
// auth work with server-rendered pages.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component (not an Action/Route Handler),
            // which can't set cookies. Harmless as long as middleware.ts is
            // also refreshing the session, which it is.
          }
        },
      },
    }
  );
}
