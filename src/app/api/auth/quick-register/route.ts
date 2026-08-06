import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/lib/email/send";
import { notifyAdminNewSignup } from "@/lib/notify-admin";
import { seedDefaultServices } from "@/lib/services/seed";

const VALID_BUSINESS_TYPES = new Set([
  "kuafor","berber","guzellik","spa","nail","estetik","makyaj","tattoo","diyetisyen","kas_kirpik",
]);

const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[çÇ]/g, "c").replace(/[ğĞ]/g, "g")
    .replace(/[ıİiİ]/g, "i").replace(/[öÖ]/g, "o")
    .replace(/[şŞ]/g, "s").replace(/[üÜ]/g, "u")
    .replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 35);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const VALID_LOCALES = new Set(["tr", "en", "ru", "ar"]);
  const { email, password, salonName, fullName, phone, businessType, locale, kvkkConsent, marketingConsent } = body as {
    email: string; password: string; salonName: string;
    fullName: string; phone: string; businessType: string;
    locale?: string; kvkkConsent: boolean; marketingConsent: boolean;
  };
  const safeLocale = locale && VALID_LOCALES.has(locale) ? locale : "tr";

  if (!email || !password || !salonName || !fullName) {
    return NextResponse.json({ error: "Eksik alanlar" }, { status: 400 });
  }

  if (!kvkkConsent) {
    return NextResponse.json({ error: "KVKK Aydınlatma Metni'ni kabul etmeniz zorunludur." }, { status: 400 });
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Geçersiz e-posta adresi." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Şifre en az 8 karakter olmalı." }, { status: 400 });
  }
  if (salonName.trim().length < 2 || salonName.length > 60) {
    return NextResponse.json({ error: "İşletme adı 2-60 karakter olmalı." }, { status: 400 });
  }
  const safeBusinessType = VALID_BUSINESS_TYPES.has(businessType) ? businessType : "kuafor";

  // Use admin client (service role) — bypasses email confirmation
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 1. Create user with email already confirmed
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, salon_name: salonName },
  });

  if (createErr) {
    const msg = createErr.message.includes("already registered")
      ? "Bu e-posta zaten kayıtlı."
      : createErr.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const userId = newUser.user.id;

  // 2. Create organization
  const slug = slugify(salonName) + "-" + Math.random().toString(36).slice(2, 6);
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .insert({
      slug,
      name: salonName,
      type: safeBusinessType,
      phone: phone || null,
      email,
      plan: "trial",
      subscription_status: "active",
      trial_ends_at: trialEndsAt,
      locale: safeLocale,
    })
    .select("id")
    .single();

  if (orgErr) {
    // Clean up user
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "İşletme oluşturulamadı." }, { status: 500 });
  }

  // 3. Create org_member + staff record
  const now = new Date().toISOString();

  await admin.from("org_members").insert({
    org_id: org.id,
    user_id: userId,
    role: "owner",
    kvkk_consent: true,
    kvkk_consent_at: now,
    marketing_consent: marketingConsent === true,
    marketing_consent_at: marketingConsent === true ? now : null,
  });

  await admin.from("staff").insert({ org_id: org.id, full_name: fullName, role: "Salon Sahibi", is_active: true });

  // 3b. Hizmet listesini iş türüne göre otomatik doldur — işletme sahibi sıfırdan
  // eklemek yerine dolu bir listeyle başlar, istemediklerini kaldırabilir.
  await seedDefaultServices(admin, org.id, safeBusinessType);

  // 4. Send welcome email via Resend (fire-and-forget, ortak şablon)
  sendWelcomeEmail({ to: email, salonName, ownerName: fullName }).catch(() => {});

  // 5. Platform admine yeni kayıt bildirimi (fire-and-forget)
  notifyAdminNewSignup({ salonName, ownerName: fullName, email, phone, businessType: safeBusinessType }).catch(() => {});

  return NextResponse.json({ success: true });
}
