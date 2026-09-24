import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

/**
 * Paket / seans takibi uçları.
 *  GET  /api/packages?customer_id=&status=&include_usages=1
 *  POST /api/packages                (paket sat)
 *
 * Sayaç + durum senkronu DB trigger'ında; bkz. 20260911_customer_packages.sql
 * ve src/lib/package-tx.ts.
 */

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customer_id");
  const status = searchParams.get("status"); // "active" | "completed" | ... | "all"
  const includeUsages = searchParams.get("include_usages") === "1";

  let query = supabase
    .from("customer_packages")
    .select(
      "*, service:services(id, name), customer:customers(id, full_name, phone)" +
        (includeUsages
          ? ", usages:customer_package_usages(id, delta, note, appointment_id, created_at)"
          : ""),
    )
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false });

  if (customerId) query = query.eq("customer_id", customerId);
  if (status && status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const packages = rows.map((p) => ({
    ...p,
    remaining_sessions: Number(p.total_sessions) - Number(p.used_sessions),
  }));

  return NextResponse.json({ packages });
}

const CreateSchema = z.object({
  customer_id: z.string().uuid(),
  service_id: z.string().uuid().nullish(),
  name: z.string().trim().min(2).max(120),
  total_sessions: z.number().int().min(1).max(500),
  price_paid: z.number().min(0).max(10_000_000).default(0),
  payment_method: z.enum(["nakit", "kart", "havale", "diger"]).default("nakit"),
  purchased_at: z.string().datetime().optional(),
  expires_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish(),
  note: z.string().trim().max(500).nullish(),
  /** true ise gelir-gider'e "paket" kategorisinde tek gelir kaydı yazılır. */
  record_income: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const parsed = CreateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz form verisi" }, { status: 400 });
  }
  const d = parsed.data;

  // Müşteri gerçekten bu işletmeye mi ait?
  const { data: customer } = await supabase
    .from("customers")
    .select("id, full_name")
    .eq("id", d.customer_id)
    .eq("org_id", member.org_id)
    .single();
  if (!customer) return NextResponse.json({ error: "Müşteri bulunamadı" }, { status: 404 });

  if (d.service_id) {
    const { data: service } = await supabase
      .from("services")
      .select("id")
      .eq("id", d.service_id)
      .eq("org_id", member.org_id)
      .single();
    if (!service) return NextResponse.json({ error: "Hizmet bulunamadı" }, { status: 404 });
  }

  const { data: pkg, error } = await supabase
    .from("customer_packages")
    .insert({
      org_id: member.org_id,
      customer_id: d.customer_id,
      service_id: d.service_id ?? null,
      name: d.name,
      total_sessions: d.total_sessions,
      price_paid: d.price_paid,
      payment_method: d.payment_method,
      purchased_at: d.purchased_at ?? new Date().toISOString(),
      expires_at: d.expires_at ?? null,
      note: d.note ?? null,
      created_by: user.id,
    })
    .select("*, service:services(id, name)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Muhasebe: satış anında tek gelir kaydı. Paketten düşen randevular daha sonra
  // price = 0 ile tamamlanır, böylece ciro iki kez sayılmaz.
  if (d.record_income && d.price_paid > 0) {
    await supabase
      .from("expenses")
      .insert({
        org_id: member.org_id,
        type: "gelir",
        category: "paket",
        amount: d.price_paid,
        description: `${customer.full_name} — ${d.name} (${d.total_sessions} seans paketi)`,
        note: "Paket satışı üzerinden otomatik oluşturuldu.",
        date: new Date().toISOString().slice(0, 10),
        payment_method: d.payment_method,
        created_by: user.id,
      })
      .then(({ error: expErr }) => {
        if (expErr) console.error("[packages] gelir kaydı yazılamadı:", expErr.message);
      });
  }

  return NextResponse.json(
    { package: { ...pkg, remaining_sessions: Number(pkg.total_sessions) - Number(pkg.used_sessions) } },
    { status: 201 },
  );
}
