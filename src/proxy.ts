import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
import { getSubscriptionLock } from "./lib/subscription-lock";
import { MOBILE_APP_COOKIE, isMobileAppUserAgent, isMobileAppCookieValue } from "./lib/mobile-app-shared";
import { CSP_NONCE_HEADER, buildCsp, generateNonce, isNonceEnabled, pathNeedsNonce } from "./lib/csp";

// Routes that require at minimum "manager" role
const MANAGER_ROUTES = [
  "/dashboard/kampanyalar",
  "/dashboard/raporlar",
  "/dashboard/gelir-gider",
  "/dashboard/veri-gocu",
  "/dashboard/personel",
  "/dashboard/website-ayarlari",
];

// Routes that require "owner" role
const OWNER_ROUTES = [
  "/dashboard/ayarlar",
  "/dashboard/abonelik",
];

const ROLE_RANK: Record<string, number> = { staff: 0, manager: 1, owner: 2 };
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Oturumu olmayan (anonim) istemcilerin de POST/PATCH/DELETE atabilmesi gereken
// uçlar: giriş/kayıt akışları, personel daveti kabul (henüz hesabı yok), herkese
// açık online randevu oluşturma/iptal, ve imza ile doğrulanan dış servis
// webhook'ları. Bu uçların kendi içinde (token/imza bazlı) yetki kontrolü var —
// buradaki genel "oturum yoksa 401" kuralından muaf tutulmaları gerekiyor,
// aksi halde örn. giriş isteğinin kendisi "oturum yok" diye 401'e düşer.
const PUBLIC_API_WRITE_PREFIXES = [
  "/api/auth",
  "/api/staff/invite/accept",
  "/api/appointments",
  "/api/public",
  "/api/webhooks",
  // pg_cron (net.http_post) ve Vercel Cron'un POST ile tetiklediği uçlar —
  // hiçbiri tarayıcı oturumu taşımaz, kendi içlerinde CRON_SECRET bearer
  // token kontrolü var. Bu istisna olmadan buradaki oturum kontrolü daha
  // route'a hiç ulaşmadan 401 döndürüyordu (örn. WhatsApp hatırlatma cron'u).
  "/api/cron",
  "/api/whatsapp/send-template",
  // Pazarlama sayfalarındaki destek sohbeti (bkz. components/marketing/
  // ChatWidget.tsx — (marketing)/layout.tsx üzerinden TÜM tanıtım sayfalarında
  // gösteriliyor). Ziyaretçilerin tanımı gereği oturumu yoktur; bu istisna
  // olmadan widget'a yazılan her mesaj daha route'a ulaşmadan 401'e düşüyordu.
  // Kötüye kullanım koruması ucun kendi içinde: IP başına saatte 20 istek +
  // 1000 karakter sınırı (route.ts).
  "/api/chat",
];

// Deneme süresi dolan / ödemesi başarısız olan işletmeler için yazma
// işlemlerine izin verilen uç noktalar: kimlik doğrulama, ayarlar sayfası,
// abonelik/ödeme akışı, dış servis webhook'ları ve — kritik olarak —
// randevu oluşturma/düzenleme/iptal. Ödeme sorunu olan bir işletmenin asıl
// gelir kaynağı (randevu almak) kilitlenirse borcunu ödeyecek geliri de
// kesilmiş olur; bu yüzden randevu akışı ödeme durumundan bağımsız açık
// tutulur, sadece abonelik/ayarlar sayfaları ve premium eklentiler kısıtlanır.
const SUBSCRIPTION_LOCK_EXEMPT_PREFIXES = [
  "/api/auth",
  "/api/org", // ayarlar sayfasının kaydet işlemi
  "/api/stripe",
  "/api/webhooks",
  "/api/admin",
  "/api/dashboard-chat", // yardım asistanı — hesap durumu hakkında yönlendirir
  "/api/appointments", // randevu oluşturma/düzenleme/iptal — asla kilitlenmemeli
  "/api/customers", // randevu akışında otomatik müşteri kaydı
  "/api/staff-time-off", // personel izin/kapalı gün kaydı — takvim bütünlüğü için
  "/api/account", // hesap silme — deneme/ödeme durumundan bağımsız her zaman açık olmalı
];

// Android Trusted Web Activity (PWABuilder'ın ürettiği Play Store paketi) ilk
// açılışta isteğe `Referer: android-app://<paket-adı>` ekler — bu, native UA
// değiştirilemediği için Android'de "native uygulama içindeyim" için tek
// güvenilir sinyal (bkz. lib/mobile-app-shared.ts). Bu, tüm dönüş noktalarını
// tek tek değiştirmemek için proxy()'nin ürettiği response'a en dışta
// uygulanır — hangi kod yolundan dönerse dönsün (redirect/json/sessionResponse)
// cookie set edilmiş olur.
function isAndroidTwaReferer(request: NextRequest): boolean {
  return !!request.headers.get("referer")?.startsWith("android-app://");
}

// Yazma isteklerinde kaynak (origin) doğrulaması — CSRF savunmasının ikinci
// katmanı.
//
// NEDEN: Supabase oturum çerezi SameSite=Lax'tır; bu, üçüncü taraf bir sitenin
// <form> POST'unu engeller ama tüm tarayıcı/WebView sürümlerinde aynı katılıkta
// uygulanmaz ve gelecekte bir uçta `credentials: "include"` gerektiren bir
// entegrasyon eklenirse sessizce delinebilir. Tarayıcı, aynı-köken olsa bile
// her POST/PUT/PATCH/DELETE isteğine `Origin` başlığını EKLER — dolayısıyla
// başlık varsa ve host'umuzla eşleşmiyorsa istek başka bir sitenin sayfasından
// geliyordur ve reddedilir.
//
// Origin YOKSA reddetmiyoruz: sunucudan sunucuya çağrılar (Meta/Stripe
// webhook'ları, pg_cron ve Vercel Cron POST'ları, curl ile yapılan sağlık
// kontrolleri) bu başlığı hiç göndermez. Onların yetkisi kendi imza/bearer
// token kontrolleriyle zaten sağlanıyor.
function isCrossSiteWrite(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  // Android Trusted Web Activity ve bazı WebView'lar opak kaynak gönderebilir;
  // bunlar tarayıcı sekmesi bağlamı olmadığı için CSRF taşıyıcısı değildir.
  if (origin === "null") return false;
  try {
    return new URL(origin).host !== request.nextUrl.host;
  } catch {
    return true; // ayrıştırılamayan Origin → güvenme
  }
}

function isMobileAppRequest(request: NextRequest): boolean {
  return (
    isMobileAppUserAgent(request.headers.get("user-agent")) ||
    isMobileAppCookieValue(request.cookies.get(MOBILE_APP_COOKIE)?.value) ||
    isAndroidTwaReferer(request)
  );
}

// Native uygulama (App Store/Play Store) mağaza kurallarına uyum için yalnızca
// "giriş ekranı + yönetici paneli" gibi davranmalı — hesap oluşturma, plan
// seçimi/ödeme ve pazarlama sayfaları kasıtlı olarak DIŞARIDA bırakılıyor.
// assetlinks.json doğrulandıktan sonra Android'de siriplan.com'a giden HER link
// (WhatsApp daveti, şifre sıfırlama e-postası vb.) otomatik olarak uygulama
// içinde açılabilir; bu yüzden "buton gizleme" tek başına yeterli değil —
// native taraf bu sayfalara asla ulaşamamalı. Personel daveti/e-posta
// doğrulama/şifre sıfırlama gibi meşru hesap işlemleri istisna: bunlar yeni
// abonelik başlatmaz, sadece mevcut hesapla ilgili işlemlerdir.
const MOBILE_APP_ALLOWED_PREFIXES = [
  "/dashboard",
  "/admin",
  "/api",
  "/auth/giris",
  "/auth/callback",
  "/auth/davet",
  "/auth/dogrula",
  "/auth/sifre-sifirla",
  "/auth/yeni-sifre",
];

// Bu istek için CSP nonce'u üretilmeli mi?
//
// Yalnızca panel BELGE isteklerinde: nonce'un tek işi, Next.js'in sayfaya
// bastığı inline script'leri imzalamak. Prefetch istekleri (next/link) ve
// yazma istekleri HTML üretmez; onlara nonce basmak boşuna iş olur ve her
// prefetch'te farklı bir nonce üretildiği için kafa karıştırıcı olurdu.
function shouldIssueNonce(request: NextRequest): boolean {
  if (!isNonceEnabled()) return false;
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (!pathNeedsNonce(request.nextUrl.pathname)) return false;
  if (request.headers.get("next-router-prefetch")) return false;
  if (request.headers.get("purpose") === "prefetch") return false;
  return true;
}

// No URL-based locale routing — locale is stored in a cookie and read
// by next-intl's getRequestConfig (src/i18n/request.ts).
// This keeps dashboard URLs clean: /dashboard not /tr/dashboard.
export async function proxy(request: NextRequest) {
  const nonce = shouldIssueNonce(request) ? generateNonce() : null;
  const response = await proxyInner(request, nonce);
  if (response && isAndroidTwaReferer(request)) {
    response.cookies.set(MOBILE_APP_COOKIE, "1", {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
    });
  }
  // CSP'nin TEK çıkış noktası (bkz. lib/csp.ts). next.config.ts artık bu
  // başlığı basmıyor — iki yerden basılsaydı tarayıcıya iki politika gider,
  // tarayıcı ikisinin kesişimini uygular ve panel sessizce kırılırdı.
  // proxyInner'ın undefined döndüğü tek durum statik varlıklardır
  // (_next/, favicon, uzantılı dosyalar); onların CSP'ye ihtiyacı yok.
  if (response) {
    response.headers.set("Content-Security-Policy", buildCsp(nonce));
  }
  return response;
}

async function proxyInner(request: NextRequest, nonce: string | null) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.\w+$/)
  ) {
    return undefined;
  }

  if (
    isMobileAppRequest(request) &&
    !MOBILE_APP_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Başka bir sitenin sayfasından gelen yazma isteklerini, oturum çerezi
  // taşınmış olsa bile en başta kes (bkz. isCrossSiteWrite).
  if (
    pathname.startsWith("/api/") &&
    WRITE_METHODS.has(request.method) &&
    isCrossSiteWrite(request)
  ) {
    return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
  }

  // updateSession refreshes the Supabase session cookie and handles
  // basic auth redirect (/dashboard → /auth/giris if not logged in).
  // Nonce, İSTEK başlığı olarak iletilir: Next.js hem kendi inline
  // script'lerini imzalamak için hem de sunucu bileşenlerinin headers()
  // ile okuyabilmesi için (bkz. app/layout.tsx) buradan alır.
  const sessionResponse = await updateSession(
    request,
    nonce ? { [CSP_NONCE_HEADER]: nonce } : undefined
  );

  // If updateSession already redirected (e.g. not authenticated), honour it.
  if (sessionResponse.status === 307 || sessionResponse.status === 308 || sessionResponse.status === 302) {
    return sessionResponse;
  }

  const isDashboardOrAdmin = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  const isApiWrite = pathname.startsWith("/api/") && WRITE_METHODS.has(request.method);
  const isPublicApiWrite = isApiWrite && PUBLIC_API_WRITE_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isDashboardOrAdmin && !isApiWrite) return sessionResponse;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (isPublicApiWrite) return sessionResponse;
    if (isApiWrite) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/auth/giris", request.url));
  }

  // /admin — fine-grained platform-admin check happens in the layout;
  // here we only require an authenticated user.
  if (pathname.startsWith("/admin")) return sessionResponse;

  // Aktif işletme cookie'si varsa o üyeliğin rolüne bak; yoksa ilk üyelik.
  const activeOrg = request.cookies.get("active_org")?.value;

  async function resolveMembership(select: string) {
    let query = supabase.from("org_members").select(select).eq("user_id", user!.id);
    if (activeOrg) query = query.eq("org_id", activeOrg);
    let { data: rows } = await query.limit(1);
    if ((!rows || rows.length === 0) && activeOrg) {
      // Cookie bayat (üyelik silinmiş) → ilk üyeliğe düş
      const { data: fallback } = await supabase
        .from("org_members")
        .select(select)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true })
        .limit(1);
      rows = fallback;
    }
    return rows?.[0] as Record<string, unknown> | undefined;
  }

  // Deneme süresi dolan / ödemesi başarısız olan işletmeler için yazma
  // işlemlerini API seviyesinde engelle (görüntüleme her zaman serbest).
  if (isApiWrite && !SUBSCRIPTION_LOCK_EXEMPT_PREFIXES.some((p) => pathname.startsWith(p))) {
    const member = await resolveMembership("organizations(plan, subscription_status, trial_ends_at)");
    const org = member?.organizations as
      | { plan: string; subscription_status: string; trial_ends_at: string | null }
      | undefined;
    if (org) {
      const lock = getSubscriptionLock(org);
      if (lock.locked) {
        // `error` burada kasıtlı olarak kullanıcıya gösterilecek Türkçe metin —
        // uygulamadaki toast.error() çağrılarının çoğu bu alanı doğrudan basıyor.
        return NextResponse.json(
          {
            error:
              lock.reason === "payment_failed"
                ? "Son ödemeniz alınamadı. Devam etmek için Abonelik sayfasından ödeme bilgilerinizi güncelleyin."
                : "Ücretsiz deneme süreniz doldu. Devam etmek için bir plan seçin.",
            code: "SUBSCRIPTION_LOCKED",
            reason: lock.reason,
          },
          { status: 402 }
        );
      }
    }
  }

  if (!isDashboardOrAdmin) return sessionResponse;

  // Role-based access control for dashboard routes
  const requiredRank = OWNER_ROUTES.some((r) => pathname.startsWith(r))
    ? 2
    : MANAGER_ROUTES.some((r) => pathname.startsWith(r))
    ? 1
    : 0;

  if (requiredRank > 0) {
    const member = await resolveMembership("role, org_id");
    const userRank = ROLE_RANK[(member?.role as string) ?? "staff"] ?? 0;
    if (userRank < requiredRank) {
      return NextResponse.redirect(new URL("/dashboard?forbidden=1", request.url));
    }
  }

  return sessionResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
