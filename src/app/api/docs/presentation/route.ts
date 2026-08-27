import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Supabase oturumunu doğrula
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Oturum yoksa 401 döndür
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Dosyayı oku
    const filePath = path.join(process.cwd(), "docs", "kullanim-kilavuzu-sunum.html");
    if (!fs.existsSync(filePath)) {
      return new NextResponse("Presentation file not found", { status: 404 });
    }

    const htmlContent = fs.readFileSync(filePath, "utf-8");

    // HTML içeriğini döndür
    return new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Güvenlik: Clickjacking'i önlemek için sadece kendi sitemizde iframe içinde oynatılabilsin
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "frame-ancestors 'self'",
      },
    });
  } catch (error) {
    console.error("Presentation API Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
