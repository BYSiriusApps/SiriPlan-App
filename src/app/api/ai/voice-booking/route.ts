import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { parseVoiceBooking } from "@/lib/voice-parse";
import { DEFAULT_ORG_TIMEZONE } from "@/lib/istanbul-time";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const member = await getActiveMember(supabase);
    if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

    const body = await req.json();
    const transcript = body.transcript || body.message;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json({ error: "Ses veya metin komutu verilmedi." }, { status: 400 });
    }

    const adminSupabase = await createAdminClient();
    const orgId = member.org_id;

    // Fetch staff, services and timezone context for fuzzy matching
    const [{ data: staffList }, { data: servicesList }, { data: orgRow }] = await Promise.all([
      adminSupabase.from("staff").select("id, full_name").eq("org_id", orgId).eq("is_active", true),
      adminSupabase.from("services").select("id, name, price, duration_minutes").eq("org_id", orgId).eq("is_active", true),
      adminSupabase.from("organizations").select("timezone").eq("id", orgId).single(),
    ]);
    const timezone = orgRow?.timezone || DEFAULT_ORG_TIMEZONE;

    /** Yerel ayrıştırıcı — Gemini yoksa/başarısızsa ya da eksik alan kaldığında. */
    const localParse = () =>
      parseVoiceBooking(transcript, staffList || [], servicesList || [], { timezone });

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      // Direct call to Gemini REST API with Function Declarations
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Sen kuaför, berber ve güzellik salonları için çalışan Türkçe akıllı sesli asistansın.
Mevcut Personeller: ${JSON.stringify(staffList || [])}
Mevcut Hizmetler: ${JSON.stringify(servicesList || [])}
Bugünün tarihi: ${new Date().toISOString().split("T")[0]} (Türkiye saati)

Kullanıcının sesli girdisi: "${transcript}"

Lütfen uygun aracı (tool call) çağır veya kullanıcıya cevap ver.`,
                  },
                ],
              },
            ],
            tools: [
              {
                functionDeclarations: [
                  {
                    name: "create_appointment",
                    description: "Yeni bir randevu oluşturur",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        customer_name: { type: "STRING", description: "Müşteri adı ve soyadı" },
                        customer_phone: { type: "STRING", description: "Müşteri telefon numarası" },
                        staff_id: { type: "STRING", description: "Personel ID'si" },
                        service_id: { type: "STRING", description: "Hizmet ID'si" },
                        appointment_at: { type: "STRING", description: "Randevu tarihi ve saati ISO formatında (ör: 2026-08-24T14:00:00+03:00)" },
                        note: { type: "STRING", description: "Randevu notu" },
                      },
                      required: ["customer_name", "appointment_at"],
                    },
                  },
                  {
                    name: "manage_inventory",
                    description: "Stok ürün ekler, günceller veya stok miktarını revize eder",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        action: { type: "STRING", enum: ["add", "update_stock", "update_price"] },
                        name: { type: "STRING", description: "Ürün adı" },
                        category: { type: "STRING", description: "Kategori (ör: Saç Bakımı, Tıraş Ürünleri)" },
                        unit: { type: "STRING", description: "Birim (adet, şişe, kutu)" },
                        quantity: { type: "NUMBER", description: "Stok adedi veya girilen miktar" },
                        price: { type: "NUMBER", description: "Satış veya maliyet fiyatı" },
                      },
                      required: ["action", "name"],
                    },
                  },
                ],
              },
            ],
          }),
        }
      );

      if (geminiRes.ok) {
        const geminiData = await geminiRes.json();
        const candidate = geminiData.candidates?.[0];
        const part = candidate?.content?.parts?.[0];

        if (part?.functionCall) {
          const fnCall = part.functionCall;

          if (fnCall.name === "create_appointment") {
            const args = fnCall.args || {};
            // Gemini'nin bulamadığı alanları yerel ayrıştırıcıyla tamamla.
            const local = localParse();
            const customerName = (args.customer_name || local.customer_name || "").trim();
            const customerPhone = (args.customer_phone || local.customer_phone || "").trim();
            const appointmentAt = args.appointment_at || local.appointment_at || "";
            const staffId = args.staff_id || local.staff_id || "";
            const serviceId = args.service_id || local.service_id || "";
            const service = servicesList?.find((s) => s.id === serviceId);

            if (body.parseOnly) {
              const missing: string[] = [];
              if (!customerName) missing.push("customer_name");
              if (!serviceId) missing.push("service");
              if (!appointmentAt) missing.push("datetime");
              return NextResponse.json({
                actionTaken: "confirm_appointment",
                partial: missing.length > 0,
                missing,
                parsed: {
                  customer_name: customerName,
                  customer_phone: customerPhone,
                  staff_id: staffId,
                  staff_name: staffList?.find((s) => s.id === staffId)?.full_name || local.staff_name || "",
                  service_id: serviceId,
                  service_name: service?.name || local.service_name || "",
                  appointment_at: appointmentAt,
                  price: service?.price || 0,
                  duration_minutes: service?.duration_minutes || 30,
                  note: args.note || "",
                },
                response: missing.length
                  ? "Söylediklerinizi aldım — eksik alanları tamamlayıp kaydedin."
                  : "Randevu bilgilerini aldım, kontrol edip kaydedin.",
              });
            }

            // Doğrudan oluşturmak için personel + hizmet + tarih/saat şart —
            // eksikse kullanıcıyı prefill'li randevu ekranına yönlendir.
            const resolvedStaffId = staffId || staffList?.[0]?.id || "";
            if (!resolvedStaffId || !serviceId || !appointmentAt) {
              return NextResponse.json({
                response: `🎙️ "${transcript}" alındı. Eksik bilgileri tamamlamanız için randevu ekranını açıyorum.`,
                actionTaken: "navigate_quickbook",
                parsed: {
                  customer_name: customerName,
                  customer_phone: customerPhone,
                  staff_id: staffId,
                  service_id: serviceId,
                  appointment_at: appointmentAt,
                },
              });
            }

            const { data: newAppt, error: apptErr } = await adminSupabase
              .from("appointments")
              .insert({
                org_id: orgId,
                customer_name: customerName || "Misafir Müşteri",
                customer_phone: customerPhone,
                staff_id: resolvedStaffId,
                assigned_staff_id: resolvedStaffId,
                service_id: serviceId,
                appointment_at: appointmentAt,
                duration_minutes: service?.duration_minutes || 30,
                price: service?.price || 0,
                note: args.note || "Sesli ajan ile oluşturuldu",
                status: "onaylandi",
                source: "voice_agent",
              })
              .select("*")
              .single();

            if (apptErr) {
              return NextResponse.json({ response: `Randevu oluşturulurken bir sorun çıktı: ${apptErr.message}` });
            }

            return NextResponse.json({
              response: `✅ ${customerName || "Müşteri"} için randevu başarıyla oluşturuldu!`,
              actionTaken: "appointment_created",
              appointment: newAppt,
            });
          }

          if (fnCall.name === "manage_inventory") {
            const args = fnCall.args || {};
            if (args.action === "add") {
              const { data: item } = await adminSupabase
                .from("inventory_items")
                .insert({
                  org_id: orgId,
                  name: args.name,
                  category: args.category || "Genel",
                  unit: args.unit || "adet",
                  current_stock: args.quantity || 10,
                  sale_price: args.price || 0,
                })
                .select("*")
                .single();

              return NextResponse.json({
                response: `📦 "${args.name}" ürünü (${args.quantity || 10} ${args.unit || "adet"}) stoklara eklendi.`,
                actionTaken: "inventory_added",
                item,
              });
            }
          }
        }

        // Gemini fonksiyon çağırmadı, sadece metinle cevap verdi:
        // parseOnly değilse ve randevu/stok niyeti yoksa bu metni göster;
        // aksi halde aşağıdaki yerel ayrıştırıcıya düş.
        if (part?.text && !body.parseOnly) {
          const t = transcript.toLocaleLowerCase("tr-TR");
          if (!/\brandevu\b|\bsaat\b|\byarın\b|\bbugün\b/.test(t)) {
            return NextResponse.json({ response: part.text });
          }
        }
      }
    }

    // ── Gemini yok / hata / fonksiyon çağrısı üretmedi → YEREL AYRIŞTIRICI ──
    const textLower = transcript.toLocaleLowerCase("tr-TR");
    const looksLikeStock =
      /\bstok\b|\bürün\b|\bşampuan\b|\bboya\b/.test(textLower) &&
      !/\brandevu\b/.test(textLower);

    if (looksLikeStock) {
      return NextResponse.json({
        response: `📦 "${transcript}" alındı. Stok yönetimi ekranına yönlendiriliyorsunuz.`,
        actionTaken: "navigate_stok",
      });
    }

    const local = localParse();

    // parseOnly: her zaman confirm_appointment döndür (ne çıkarıldıysa),
    // istemci kısmi sonucu forma yazsın, kullanıcı tamamlasın.
    if (body.parseOnly) {
      return NextResponse.json({
        actionTaken: "confirm_appointment",
        partial: local.missing.length > 0,
        missing: local.missing,
        parsed: local,
        response: local.missing.length
          ? "Söylediklerinizi aldım — eksik alanları tamamlayıp kaydedin."
          : "Randevu bilgilerini aldım, kontrol edip kaydedin.",
      });
    }

    // parseOnly değil (yardım asistanı): yeterli bilgi varsa oluştur,
    // yoksa prefill'li randevu ekranına yönlendir.
    const svc = servicesList?.find((s) => s.id === local.service_id);
    const staffForCreate = local.staff_id || staffList?.[0]?.id || "";
    if (local.customer_name && local.appointment_at && local.service_id && staffForCreate) {
      const { data: newAppt, error: apptErr } = await adminSupabase
        .from("appointments")
        .insert({
          org_id: orgId,
          customer_name: local.customer_name,
          customer_phone: local.customer_phone,
          staff_id: staffForCreate,
          assigned_staff_id: staffForCreate,
          service_id: local.service_id,
          appointment_at: local.appointment_at,
          duration_minutes: svc?.duration_minutes || 30,
          price: svc?.price || 0,
          note: "Sesli ajan ile oluşturuldu",
          status: "onaylandi",
          source: "voice_agent",
        })
        .select("*")
        .single();
      if (!apptErr) {
        return NextResponse.json({
          response: `✅ ${local.customer_name} için randevu oluşturuldu!`,
          actionTaken: "appointment_created",
          appointment: newAppt,
        });
      }
    }

    return NextResponse.json({
      response: `🎙️ "${transcript}" alındı. Eksik bilgileri tamamlamanız için randevu ekranını açıyorum.`,
      actionTaken: "navigate_quickbook",
      parsed: local,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || "Sesli ajan çalıştırılamadı." }, { status: 500 });
  }
}
