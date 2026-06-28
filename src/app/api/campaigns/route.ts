import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single();
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

  const { data: member } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single();
  if (!member) return NextResponse.json({ error: "No org" }, { status: 403 });
  if (member.role === "staff") return NextResponse.json({ error: "Yetersiz yetki" }, { status: 403 });

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      org_id: member.org_id,
      name,
      type,
      message_template,
      channel,
      segment_json,
      status: "draft",
      sent_count: 0,
      scheduled_at: scheduled_at || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaign: data }, { status: 201 });
}
