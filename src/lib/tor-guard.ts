/**
 * Tor çıkış düğümü (exit node) tespiti — genele açık formlar için.
 *
 * NEDEN: IP bazlı hız sınırı, saldırganın IP'sini istediği an değiştirebildiği
 * durumda hiçbir şey ifade etmez. Tor tam olarak bunu bedava sağlıyor: devre
 * yenile, yeni çıkış IP'si, sayaç sıfırlanır. Çıkış düğümlerinin listesi ise
 * halka açık ve kesin — Tor projesi bunu kendisi yayınlıyor. Yani bu, tahmin
 * yürüten bir "VPN skoru" değil, doğrulanabilir bir olgu.
 *
 * KAPSAM DÜRÜSTLÜĞÜ: Bu yalnızca Tor'u yakalar. Ticari VPN'ler (NordVPN,
 * Mullvad…) ve veri merkezi proxy'leri BURADA YAKALANMAZ; onlar için ücretli
 * bir IP itibar servisi (IPQualityScore, ipapi vb.) gerekir. Böyle bir servis
 * eklenirse yeri burasıdır — çağıran kod değişmez.
 *
 * FAIL-OPEN: liste indirilemezse (ağ hatası, Tor projesi kesintisi) hiç kimse
 * engellenmez. Bir savunma KATMANI'nın çökmesi, formun tamamen kullanılamaz
 * hâle gelmesinden çok daha az zararlı.
 */

/** Tor projesinin resmî toplu çıkış düğümü listesi — düz metin, satır başına bir IP. */
const TOR_EXIT_LIST_URL = "https://check.torproject.org/torbulkexitlist";

/** Liste günde bir tazelenir; Tor çıkış havuzu bundan daha hızlı dönmez. */
const REFRESH_MS = 24 * 60 * 60 * 1000;
/** Liste indirilemezse bu süre boyunca tekrar denenmez — her istekte 4 sn beklenmesin. */
const FAILURE_BACKOFF_MS = 30 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;

let cache: Set<string> | null = null;
let cachedAt = 0;
let inFlight: Promise<Set<string> | null> | null = null;

async function fetchExitList(): Promise<Set<string> | null> {
  try {
    const res = await fetch(TOR_EXIT_LIST_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      // Vercel'in data cache'i devrede olsun: aynı bölgedeki tüm lambda'lar
      // tek indirmeyi paylaşır, bellek cache'i soğuk başlangıçta bile ucuz dolar.
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const text = await res.text();
    const ips = new Set<string>();
    for (const line of text.split("\n")) {
      const ip = line.trim();
      if (ip && !ip.startsWith("#")) ips.add(ip);
    }
    // Boş/bozuk yanıtı "hiçbir IP Tor değil" diye önbelleğe almayalım.
    return ips.size > 0 ? ips : null;
  } catch {
    return null;
  }
}

/**
 * Verilen IP bir Tor çıkış düğümü mü? Liste hazır değilse indirilir.
 * Hata hâlinde `false` döner (fail-open) — yukarıdaki nota bakın.
 */
export async function isTorExitNode(ip: string): Promise<boolean> {
  if (!ip || ip === "unknown") return false;

  const now = Date.now();
  const stale = !cache || now - cachedAt > REFRESH_MS;

  if (stale) {
    // Aynı anda gelen isteklerin hepsi ayrı ayrı indirmesin.
    inFlight ??= fetchExitList().then((list) => {
      if (list) {
        cache = list;
        cachedAt = Date.now();
      } else if (!cache) {
        // Hiç listemiz yokken indirme başarısız: bir süre tekrar deneme.
        cachedAt = Date.now() - REFRESH_MS + FAILURE_BACKOFF_MS;
        cache = new Set();
      }
      inFlight = null;
      return cache;
    });

    // Elimizde eski bir liste varsa onu kullanıp tazelenmeyi beklemeyiz;
    // hiç liste yoksa (ilk istek) indirmeyi beklemek zorundayız.
    if (!cache) await inFlight;
  }

  return cache?.has(ip) ?? false;
}
