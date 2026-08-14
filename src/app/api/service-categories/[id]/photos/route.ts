import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient } from "@/lib/supabase/server";

const MAX_PHOTOS_PER_CATEGORY = 20;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Geçersiz fotoğraf" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const { count } = await supabase
    .from("service_category_photos")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if ((count ?? 0) >= MAX_PHOTOS_PER_CATEGORY) {
    return NextResponse.json({ error: `Bir kategoriye en fazla ${MAX_PHOTOS_PER_CATEGORY} fotoğraf eklenebilir` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("service_category_photos")
    .insert({ org_id: member.org_id, category_id: id, url, display_order: count ?? 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ photo: data });
}
