import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isSupportedLanguage } from "@/lib/languages";
import { limitByIp, hit, tooManyRequests } from "@/lib/rate-limit";

// Kimlik doğrulama hatalarında TEK ve genel mesaj kullanılır. "Bu telefona bağlı
// hesap yok" gibi ayrıştırıcı mesajlar, saldırganın hangi telefon numarasının /
// e-postanın sistemde kayıtlı olduğunu tek tek sınamasına (hesap sayımı,
// account enumeration) izin veriyordu.
const GENERIC_AUTH_ERROR = "E-posta/telefon veya şifre hatalı";

/**
 * Giriş yapan kullanıcının personel kaydında tercih edilen dil varsa
 * döndürür. Panel dili (NEXT_LOCALE cookie) girişte bu dile çekilir.
 * Kolon henüz migrate edilmemişse veya kayıt yoksa null döner.
 */
async function getStaffPreferredLanguage(email: string): Promise<string | null> {
  try {
    const admin = await createAdminClient();
    const { data } = await admin
      .from("staff")
      .select("preferred_language")
      .ilike("email", email)
      .not("preferred_language", "is", null)
      .limit(1)
      .maybeSingle();
    const lang = data?.preferred_language;
    return isSupportedLanguage(lang) ? lang : null;
  } catch {
    return null;
  }
}

// Telefonu sadece rakamlara indirger ve son 10 haneyi alır
// ("+90 532 111 22 33", "0532 111 22 33", "5321112233" hepsi eşleşir).
function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  return digits.slice(-10);
}

/**
 * E-posta VEYA telefon numarası ile giriş.
 *
 * Personel kayıtları telefon numarasıyla tutulduğu için personel,
 * sisteme tanımlı telefonuyla da giriş yapabilir. Telefon girildiğinde
 * service role ile staff kaydından e-posta çözülür ve normal
 * signInWithPassword akışı çalışır (şifre yanlışsa e-posta sızmaz).
 */
export async function POST(req: NextRequest) {
  const { identifier, password, rememberMe } = await req.json().catch(() => ({}));
  if (!identifier || !password) {
    return NextResponse.json({ error: "E-posta/telefon ve şifre gerekli" }, { status: 400 });
  }

  // Kaba kuvvet (brute force) savunması. Supabase'in kendi sınırı e-posta
  // gönderimlerine odaklıdır; şifre denemesi burada sınırlanmazsa bir bot
  // saniyede yüzlerce şifre deneyebilir.
  const ipLimit = limitByIp(req, "login", 20, 15 * 60 * 1000);
  if (!ipLimit.ok) {
    return tooManyRequests(
      ipLimit,
      "Çok fazla giriş denemesi yapıldı. Lütfen birkaç dakika sonra tekrar deneyin."
    ) as unknown as NextResponse;
  }
  // Hesap başına ayrı sayaç: IP değiştiren dağıtık denemeler tek bir hesabı
  // hedeflediğinde de durur.
  const idLimit = hit(`login-id:${String(identifier).trim().toLowerCase()}`, 10, 15 * 60 * 1000);
  if (!idLimit.ok) {
    return tooManyRequests(
      idLimit,
      "Bu hesap için çok fazla giriş denemesi yapıldı. Lütfen birkaç dakika sonra tekrar deneyin."
    ) as unknown as NextResponse;
  }

  const supabase = await createClient({ persistSession: rememberMe !== false });

  const candidates: string[] = [];

  if (String(identifier).includes("@")) {
    candidates.push(String(identifier).trim().toLowerCase());
  } else {
    const wanted = normalizePhone(String(identifier));
    if (wanted.length < 7) {
      return NextResponse.json({ error: "Geçersiz telefon numarası" }, { status: 400 });
    }

    const admin = await createAdminClient();
    const tail = wanted.slice(-4);

    // Personel kayıtlarında telefon eşleşmesi ara
    const { data: staffRows } = await admin
      .from("staff")
      .select("email, phone")
      .not("email", "is", null)
      .ilike("phone", `%${tail}%`)
      .limit(50);

    for (const row of staffRows ?? []) {
      if (row.phone && normalizePhone(row.phone) === wanted && row.email) {
        const email = row.email.trim().toLowerCase();
        if (!candidates.includes(email)) candidates.push(email);
      }
    }

    // İşletme sahipleri: organizasyon telefonu üzerinden
    const { data: orgRows } = await admin
      .from("organizations")
      .select("email, phone")
      .not("email", "is", null)
      .ilike("phone", `%${tail}%`)
      .limit(20);

    for (const row of orgRows ?? []) {
      if (row.phone && normalizePhone(row.phone) === wanted && row.email) {
        const email = row.email.trim().toLowerCase();
        if (!candidates.includes(email)) candidates.push(email);
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
    }
  }

  // En fazla 3 aday e-posta dene (aynı telefon birden çok kayıtta olabilir)
  let lastError = GENERIC_AUTH_ERROR;
  for (const email of candidates.slice(0, 3)) {
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      const res = NextResponse.json({ ok: true });

      // Kullanıcı daha önce panelden kendi dilini seçmediyse (hesabında henüz
      // user_metadata.locale yoksa), personel kaydındaki tercih edilen dili
      // hem çereze hem hesaba yazarak ilk giriş için öner. Kullanıcı zaten
      // kendi seçimini yapmışsa bu bootstrap onu bir daha ezmez.
      const existingLocale = signInData.user?.user_metadata?.locale;
      if (!existingLocale) {
        const lang = await getStaffPreferredLanguage(email);
        if (lang) {
          res.cookies.set("NEXT_LOCALE", lang, {
            path: "/",
            maxAge: 60 * 60 * 24 * 365,
            sameSite: "lax",
          });
          await supabase.auth.updateUser({ data: { locale: lang } });
        }
      }
      return res;
    }
    // Supabase'in ham hata metni ("Invalid login credentials", "Email not
    // confirmed" vb.) hesabın var olup olmadığını ele verebilir; sadece
    // loglanır, kullanıcıya genel mesaj döner.
    lastError = error.message;
  }

  console.warn("[auth] başarısız giriş:", lastError);
  return NextResponse.json({ error: GENERIC_AUTH_ERROR }, { status: 401 });
}
