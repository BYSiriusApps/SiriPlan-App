import { NextRequest, NextResponse } from "next/server";
import { limitByIp, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * CSP FAZ 2 — tarayıcıdan gelen ihlal raporlarının toplandığı uç.
 *
 * NEDEN VAR: scripts/security/csp-scan.mjs politikayı bizim gezdiğimiz
 * sayfalarda test eder. Ama gerçek kullanıcılar bizim denemediğimiz yolları
 * yürür: tarayıcı eklentileri script enjekte eder, eski Safari sürümleri
 * 'strict-dynamic' desteklemez, bir sonraki dağıtım nonce'suz bir <script>
 * ekleyebilir. Bu uç, politikanın canlıda gerçekten kimseyi kırmadığını
 * (veya kırdığını) kanıtlayan tek kaynaktır.
 *
 * SESSİZDİR: yanıt her zaman 204'tür. Tarayıcı bu isteğin sonucuyla
 * ilgilenmez; hata döndürmek yalnızca konsolu kirletir.
 *
 * GÜRÜLTÜ UYARISI: raporların büyük kısmı bizim politikamızla ilgili değildir
 * — tarayıcı eklentileri, antivirüs enjeksiyonları ve ISS reklam araya
 * girmeleri sürekli ihlal üretir. Bu yüzden aşağıda bilinen gürültü
 * kaynakları elenip yalnızca kendi kaynaklarımızla ilgili raporlar loglanır.
 */

// Eklenti/antivirüs kaynaklı raporlar: bizim politikamızın sorunu değil.
const NOISE_SCHEMES = /^(chrome-extension|moz-extension|safari-extension|safari-web-extension|webkit-masked-url|about|data):/i;

type ViolationBody = {
  "blocked-uri"?: string;
  "effective-directive"?: string;
  "violated-directive"?: string;
  "document-uri"?: string;
  "source-file"?: string;
  "line-number"?: number;
  "script-sample"?: string;
  disposition?: string;
};

/**
 * İki farklı biçim gelebilir:
 *   • report-uri  → { "csp-report": { ... } }            (application/csp-report)
 *   • Reporting API → [ { type, body: { ... } }, ... ]   (application/reports+json)
 * İkisi de tek bir listeye indirgenir.
 */
function extractViolations(payload: unknown): ViolationBody[] {
  if (Array.isArray(payload)) {
    return payload
      .filter((r) => r && typeof r === "object" && (r as { type?: string }).type === "csp-violation")
      .map((r) => (r as { body?: ViolationBody }).body ?? {});
  }
  if (payload && typeof payload === "object") {
    const wrapped = (payload as { "csp-report"?: ViolationBody })["csp-report"];
    if (wrapped) return [wrapped];
  }
  return [];
}

export async function POST(req: NextRequest) {
  // Tarayıcı raporları görece nadirdir; bu tavan, uca sahte rapor yağdırıp
  // log maliyeti çıkarmayı engeller. Aşan istekler de 204 alır — saldırgana
  // sınırın varlığı bile söylenmez.
  const limit = limitByIp(req, "csp-report", 60, 60_000);
  if (!limit.ok) return new NextResponse(null, { status: 204 });

  // Gövde boyutu tavanı: JSON.parse'ı çok büyük bir yükle meşgul etmeyi önler.
  const raw = await req.text().catch(() => "");
  if (!raw || raw.length > 16_000) return new NextResponse(null, { status: 204 });

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  for (const v of extractViolations(payload)) {
    const blocked = v["blocked-uri"] ?? "";
    const source = v["source-file"] ?? "";
    if (NOISE_SCHEMES.test(blocked) || NOISE_SCHEMES.test(source)) continue;

    // Vercel log'larında aranabilir tek satır. Enforce mu report-only mu
    // olduğu kritik: "report" olanlar HENÜZ kimseyi kırmıyor, Faz 3 için
    // kanıt topluyor; "enforce" olanlar CANLIDA BİR ŞEYİ KIRIYOR demektir.
    console.warn(
      "[csp-violation]",
      JSON.stringify({
        disposition: v.disposition ?? "enforce",
        directive: v["effective-directive"] ?? v["violated-directive"] ?? "?",
        blocked: blocked.slice(0, 200),
        document: (v["document-uri"] ?? "").slice(0, 200),
        source: source.slice(0, 200),
        line: v["line-number"],
        sample: (v["script-sample"] ?? "").slice(0, 120),
        ip: clientIp(req),
      })
    );
  }

  return new NextResponse(null, { status: 204 });
}
