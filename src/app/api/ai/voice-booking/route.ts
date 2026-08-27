import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createAdminClient, createClient } from "@/lib/supabase/server";

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

    // Fetch staff and services context for fuzzy matching
    const [{ data: staffList }, { data: servicesList }] = await Promise.all([
      adminSupabase.from("staff").select("id, full_name").eq("org_id", orgId).eq("is_active", true),
      adminSupabase.from("services").select("id, name, price, duration_minutes").eq("org_id", orgId).eq("is_active", true),
    ]);

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
            const staffId = args.staff_id || staffList?.[0]?.id;
            const serviceId = args.service_id || servicesList?.[0]?.id;
            const service = servicesList?.find((s) => s.id === serviceId);
            if (body.parseOnly) {
              return NextResponse.json({
                actionTaken: "confirm_appointment",
                parsed: {
                  customer_name: args.customer_name || "",
                  customer_phone: args.customer_phone || "",
                  staff_id: staffId || "",
                  staff_name: staffList?.find((s) => s.id === staffId)?.full_name || "",
                  service_id: serviceId || "",
                  service_name: service?.name || "",
                  appointment_at: args.appointment_at || "",
                  price: service?.price || 0,
                  duration_minutes: service?.duration_minutes || 30,
                  note: args.note || "",
                },
                response: `Randevu özet bilgileri alındı.`
              });
            }

            const { data: newAppt, error: apptErr } = await adminSupabase
              .from("appointments")
              .insert({
                org_id: orgId,
                customer_name: args.customer_name || "Misafir Müşteri",
                customer_phone: args.customer_phone || "",
                staff_id: staffId,
                assigned_staff_id: staffId,
                service_id: serviceId,
                appointment_at: args.appointment_at || new Date().toISOString(),
                duration_minutes: service?.duration_minutes || 30,
                price: service?.price || 0,
                note: args.note || "Gemini Sesli Ajan ile oluşturuldu",
                status: "onaylandi",
                source: "voice_agent",
              })
              .select("*")
              .single();

            if (apptErr) {
              return NextResponse.json({ response: `Randevu oluşturulurken bir sorun çıktı: ${apptErr.message}` });
            }

            return NextResponse.json({
              response: `✅ ${args.customer_name || "Müşteri"} için randevu başarıyla oluşturuldu!`,
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

        if (part?.text) {
          return NextResponse.json({ response: part.text });
        }
      }
    }

    // Smart Fallback Parser if Gemini API Key not provided or generic command
    const textLower = transcript.toLowerCase();

    if (textLower.includes("randevu") || textLower.includes("saat") || textLower.includes("yarın") || textLower.includes("bugün")) {
      return NextResponse.json({
        response: `🎙️ "${transcript}" sesli komutunuz alındı. Randevu oluşturma ekranına yönlendiriliyorsunuz.`,
        actionTaken: "navigate_quickbook",
      });
    }

    if (textLower.includes("stok") || textLower.includes("ürün") || textLower.includes("şampuan") || textLower.includes("boya")) {
      return NextResponse.json({
        response: `📦 "${transcript}" sesli komutunuz alındı. Stok yönetimi ekranına yönlendiriliyorsunuz.`,
        actionTaken: "navigate_stok",
      });
    }

    return NextResponse.json({
      response: `Dinledim: "${transcript}". Randevu oluşturmak için "Yarın saat 15:00'e Zeynep'e randevu ver" veya stok eklemek için "Stoklara 10 adet şampuan ekle" diyebilirsiniz.`,
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json({ error: error.message || "Sesli ajan çalıştırılamadı." }, { status: 500 });
  }
}
