import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 1) {
    return NextResponse.json({ customers: [], staff: [], services: [] });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const orgId = member.org_id;
  const pattern = `%${q}%`;

  const [customersRes, staffRes, servicesRes] = await Promise.all([
    supabase
      .from("customers")
      .select("id, full_name, phone")
      .eq("org_id", orgId)
      .ilike("full_name", pattern)
      .limit(5),
    supabase
      .from("staff")
      .select("id, full_name, role")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .ilike("full_name", pattern)
      .limit(5),
    supabase
      .from("services")
      .select("id, name, price, duration_minutes")
      .eq("org_id", orgId)
      .eq("is_active", true)
      .ilike("name", pattern)
      .limit(5),
  ]);

  return NextResponse.json({
    customers: customersRes.data || [],
    staff: staffRes.data || [],
    services: servicesRes.data || [],
  });
}
