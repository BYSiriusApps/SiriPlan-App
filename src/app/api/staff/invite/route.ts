import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendTelegramMessage } from "@/lib/telegram";
import { sendWhatsAppMessage } from "@/lib/whatsapp-notify";

const InviteSchema = z.object({
  staff_id: z.string().uuid().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  role: z.enum(["staff", "manager"]).default("staff"),
  permissions_json: z.record(z.boolean()).optional().default({}),
  // Bildirim kanalı tercihi (varsayılan: ikisi de dolu ise her ikisi)
  notify_via: z.enum(["email", "whatsapp", "telegram", "all"]).default("all"),
});

/** POST /api/staff/invite — salon sahibi/yöneticisi personele davet gönderir */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`).join("; ");
    return NextResponse.json({ error: firstError || "Geçersiz form verisi" }, { status: 400 });
  }

  const data = parsed.data;
  if (!data.email && !data.phone) {
    return NextResponse.json({ error: "E-posta veya telefon zorunludur" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single();

  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  // Org info + plan check
  const { data: org } = await supabase
    .from("organizations")
    .select("name, plan, max_staff, telegram_chat_id")
    .eq("id", member.org_id)
    .single();

  if (!org) return NextResponse.json({ error: "Organizasyon bulunamadı" }, { status: 404 });

  // Mevcut aktif personel sayısı kontrolü
  const { count } = await supabase
    .from("staff")
    .select("id", { count: "exact", head: true })
    .eq("org_id", member.org_id)
    .eq("is_active", true);

  const maxStaff = (org as { max_staff?: number }).max_staff ?? 3;
  if ((count ?? 0) >= maxStaff) {
    return NextResponse.json(
      { error: `Plan limitine ulaşıldı (maks. ${maxStaff} personel)` },
      { status: 403 }
    );
  }

  // Mevcut bekleyen davet varsa iptal et
  if (data.email) {
    await supabase
      .from("staff_invitations")
      .update({ status: "revoked" })
      .eq("org_id", member.org_id)
      .eq("email", data.email)
      .eq("status", "pending");
  }

  // Build default permissions based on role
  const defaultPermissions =
    data.role === "manager"
      ? {
          view_customers: true, edit_customers: true,
          view_reports: true, edit_services: true,
          manage_staff: false, view_financials: true,
          manage_campaigns: true, view_calendar: true,
          create_appointments: true, edit_appointments: true,
          cancel_appointments: true,
        }
      : {
          view_customers: true, edit_customers: false,
          view_reports: false, edit_services: false,
          manage_staff: false, view_financials: false,
          manage_campaigns: false, view_calendar: true,
          create_appointments: true, edit_appointments: true,
          cancel_appointments: false,
        };

  const mergedPermissions = { ...defaultPermissions, ...data.permissions_json };

  // Create invitation
  const { data: invite, error: inviteErr } = await supabase
    .from("staff_invitations")
    .insert({
      org_id: member.org_id,
      staff_id: data.staff_id ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      role: data.role,
      permissions_json: mergedPermissions,
      status: "pending",
      created_by: user.id,
    })
    .select("token, expires_at")
    .single();

  if (inviteErr || !invite) {
    return NextResponse.json({ error: inviteErr?.message ?? "Davet oluşturulamadı" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://siriplan.com";
  const inviteUrl = `${appUrl}/auth/davet?token=${invite.token}`;
  const orgName = (org as { name: string }).name;
  const message =
    `🎉 ${orgName} sizi Siriplan'a personel olarak davet etti!\n\n` +
    `Katılmak için aşağıdaki bağlantıyı kullanın:\n${inviteUrl}\n\n` +
    `Davet süresi: 7 gün`;

  // Bildirim kanalları (fire-and-forget)
  const tasks: Promise<void>[] = [];

  if (data.phone && (data.notify_via === "whatsapp" || data.notify_via === "all")) {
    tasks.push(sendWhatsAppMessage(data.phone, message).catch(() => {}));
  }

  // Telegram: if staff record has chat_id
  if (data.staff_id) {
    const { data: staffRow } = await supabase
      .from("staff")
      .select("telegram_chat_id")
      .eq("id", data.staff_id)
      .single();
    const tgId = (staffRow as { telegram_chat_id?: string | null } | null)?.telegram_chat_id;
    if (tgId && (data.notify_via === "telegram" || data.notify_via === "all")) {
      tasks.push(sendTelegramMessage(tgId, message).catch(() => {}));
    }
  }

  await Promise.allSettled(tasks);

  return NextResponse.json({
    token: invite.token,
    invite_url: inviteUrl,
    expires_at: invite.expires_at,
  }, { status: 201 });
}

/** GET /api/staff/invite — salon davetlerini listeler */
export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single();

  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const { data, error } = await supabase
    .from("staff_invitations")
    .select("id, email, phone, role, status, expires_at, created_at, staff(full_name)")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invitations: data });
}
