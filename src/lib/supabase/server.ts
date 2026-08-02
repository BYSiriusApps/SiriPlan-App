import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * `persistSession: false` verildiğinde ("Beni hatırla" işaretli değilse) auth
 * çerezleri kalıcı olmayan (tarayıcı kapanınca silinen) oturum çerezi olarak
 * yazılır — maxAge/expires atılır. Diğer tüm çağıranlar (persistSession
 * verilmeyen) mevcut kalıcı davranışı aynen korur.
 */
export async function createClient(opts?: { persistSession?: boolean }) {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              const finalOptions =
                opts?.persistSession === false
                  ? { ...options, maxAge: undefined, expires: undefined }
                  : options;
              cookieStore.set(name, value, finalOptions);
            });
          } catch {}
        },
      },
    }
  );
}

export async function createAdminClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
