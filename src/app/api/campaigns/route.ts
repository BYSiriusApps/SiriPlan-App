import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/lib/permissions";
import { parseOfferInput } from "@/lib/campaign-offer";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, type, message_template, channel = "whatsapp", segment_json = {}, scheduled_at } = body;

  if (!name || !type || !message_template) {
    return NextResponse.json({ error: "Ad, tür ve mesaj zorunlu" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (!hasPermission(member, "manage_campaigns")) return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  // İleri bir tarih seçildiyse kampanya "scheduled" olarak kaydedilir ve
  // cron (/api/cron/campaigns) o tarih geldiğinde otomatik gönderir; geçmiş
  // bir tarih ya da tarih seçilmediyse hemen gönderime hazır taslak kalır.
  const scheduledAtIso = scheduled_at || null;
  const isFutureSchedule = !!scheduledAtIso && new Date(scheduledAtIso).getTime() > Date.now();

  // İsteğe bağlı indirim teklifi (tür, değer, son gün, hizmet/tutar koşulu).
  const offerResult = parseOfferInput(body, scheduledAtIso);
  if (!offerResult.ok) return NextResponse.json({ error: offerResult.error }, { status: 400 });
  const offer = offerResult.offer;

  // Seçilen hizmetler bu işletmeye ait olmalı (başka kiracının hizmet kimliği kabul edilmez).
  if (offer?.service_ids) {
    const { data: ownServices } = await supabase
      .from("services")
      .select("id")
      .eq("org_id", member.org_id)
      .in("id", offer.service_ids);
    if ((ownServices ?? []).length !== offer.service_ids.length) {
      return NextResponse.json({ error: "Seçilen hizmetlerden biri bulunamadı" }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      org_id: member.org_id,
      name,
      type,
      message_template,
      channel,
      segment_json,
      status: isFutureSchedule ? "scheduled" : "draft",
      sent_count: 0,
      scheduled_at: scheduledAtIso,
      // Yalnızca teklif tanımlıysa yazılır — tanımsız kampanyalar eski şemayla da çalışır.
      ...(offer ? {
        discount_type: offer.discount_type,
        discount_value: offer.discount_value,
        valid_until: offer.valid_until,
        service_ids: offer.service_ids,
        min_amount: offer.min_amount,
      } : {}),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data }, { status: 201 });
}
