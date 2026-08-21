import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

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

/**
 * Oturum sahibi kullanıcı — İSTEK BAŞINA TEK KEZ sorgulanır.
 *
 * NEDEN: `supabase.auth.getUser()` yerel bir okuma değil, her çağrıda Supabase
 * Auth sunucusuna giden bir AĞ isteğidir (token'ı sunucuda doğrular; bu yüzden
 * `getSession()`'dan güvenlidir ve öyle kalmalı). Panelde tek bir sayfa geçişi
 * bu çağrıyı sırayla 6-8 kez tetikliyordu: dashboard/layout.tsx bir kez,
 * getActiveMember/getMemberships/isPlatformAdmin birer kez daha, sonra sayfanın
 * kendisi ve onun getActiveMember'ı... Her biri ~100-200 ms olduğu için HTML
 * daha akmaya başlamadan saniyeler kaybediliyordu — panelin "ağırlaşmasının"
 * asıl sebebi buydu.
 *
 * React `cache()` sonucu YALNIZCA tek bir istek/render içinde paylaşır;
 * istekler veya kullanıcılar arasında hiçbir şey sızmaz (istemciler arası
 * paylaşılan bir modül değişkeni değildir). Doğrulama davranışı aynen korunur,
 * sadece aynı doğrulama tekrar tekrar yapılmaz.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

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
