import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * @param extraRequestHeaders Sunucu bileşenlerine iletilmek üzere isteğe
 *   eklenecek başlıklar (CSP nonce'u için — bkz. lib/csp.ts). Next.js, render
 *   sırasında nonce'u yalnızca İSTEK başlıklarından okuyabildiği için buraya
 *   enjekte edilmek zorunda; yanıta eklemek yetmez.
 */
export async function updateSession(
  request: NextRequest,
  extraRequestHeaders?: Record<string, string>
) {
  // Yanıt, çerez yazımı sırasında yeniden kurulduğu için başlık birleştirme
  // tek bir yardımcıda toplanıyor. `request.cookies.set()` çağrıları isteğin
  // cookie başlığını yerinde günceller; bu yüzden başlıkların kopyası HER
  // ZAMAN çağrı anında alınmalı, önceden değil.
  const nextWithHeaders = () => {
    if (!extraRequestHeaders) return NextResponse.next({ request });
    const headers = new Headers(request.headers);
    for (const [key, value] of Object.entries(extraRequestHeaders)) {
      headers.set(key, value);
    }
    return NextResponse.next({ request: { headers } });
  };

  let supabaseResponse = nextWithHeaders();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = nextWithHeaders();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname.includes("/dashboard")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/giris";
      return NextResponse.redirect(url);
    }
  }

  if (user && (pathname.includes("/auth/giris") || pathname.includes("/auth/kayit"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
