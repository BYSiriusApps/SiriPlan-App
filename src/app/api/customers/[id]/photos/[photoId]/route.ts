import { NextRequest, NextResponse } from "next/server";
import { getActiveMember } from "@/lib/active-org";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string; photoId: string }> };

const BUCKET = "customer-photos";

/** DELETE /api/customers/[id]/photos/[photoId] — kayıt + storage nesnelerini siler (KVKK erişim/silme hakkı). */
export async function DELETE(req: NextRequest, { params }: Params) {
  const { id, photoId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await getActiveMember(supabase);
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });

  const { data: row } = await supabase
    .from("customer_photos")
    .select("id, before_path, after_path")
    .eq("id", photoId)
    .eq("org_id", member.org_id)
    .eq("customer_id", id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Fotoğraf bulunamadı" }, { status: 404 });

  const { error: delErr } = await supabase
    .from("customer_photos")
    .delete()
    .eq("id", photoId)
    .eq("org_id", member.org_id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const admin = await createAdminClient();
  await admin.storage.from(BUCKET).remove([row.before_path, row.after_path]);

  return NextResponse.json({ ok: true });
}
