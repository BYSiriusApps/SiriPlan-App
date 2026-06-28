import { NextRequest, NextResponse } from "next/server";

// Meta webhook verification
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.INSTAGRAM_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const entry = body?.entry?.[0];
    const messaging = entry?.messaging?.[0];

    if (!messaging) return NextResponse.json({ ok: true });

    const senderId = messaging.sender?.id;
    const text = messaging.message?.text;

    if (!senderId || !text) return NextResponse.json({ ok: true });

    // AI auto-reply is handled separately via the AI assistant
    // For now, log the incoming message
    console.log(`[IG] From ${senderId}: ${text}`);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
