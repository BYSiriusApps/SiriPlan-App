/**
 * Ortak LLM çağrı katmanı: AI yanıt (WhatsApp/IG/Messenger), site sohbet botu ve
 * sesli randevu aynı yerden model seçer ve YEDEKLİ çalışır.
 *
 * NEDEN: Modeller kapanıyor — `gemini-2.0-flash` Google'da kapatıldı (404) ve üç
 * özellik sessizce statik yanıta düştü. Model adı artık tek yerde, env ile
 * değiştirilebilir (kod değişikliği gerekmez) ve bir model/sağlayıcı düşerse
 * sıradaki denenir.
 *
 * Sıra (düz metin): GEMINI_MODEL → GEMINI_FALLBACK_MODEL → Claude (YALNIZCA
 * ANTHROPIC_API_KEY tanımlıysa). Claude yedeği isteğe bağlıdır; anahtar
 * tanımlanmadıkça hiçbir veri Anthropic'e gitmez (gizlilik metni / mağaza
 * beyanı güncellenmeden anahtar eklenmemeli).
 * Fonksiyon çağırma (sesli randevu) yalnızca Gemini modellerini dener.
 */

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
export const DEFAULT_GEMINI_FALLBACK_MODEL = "gemini-3.1-flash-lite";
export const DEFAULT_CLAUDE_FALLBACK_MODEL = "claude-haiku-5-5";

const GEMINI_TIMEOUT_MS = 10_000;
const CLAUDE_TIMEOUT_MS = 12_000;

function realKey(value: string | undefined): string | null {
  if (!value) return null;
  if (value.includes("placeholder") || value === "your-gemini-api-key-here") return null;
  return value;
}

function geminiKey(): string | null {
  return realKey(process.env.GEMINI_API_KEY);
}

function claudeKey(): string | null {
  return realKey(process.env.ANTHROPIC_API_KEY);
}

/** Gemini anahtarı tanımlı (ve placeholder değil) mi? */
export function hasGeminiKey(): boolean {
  return !!geminiKey();
}

/** En az bir sağlayıcı (Gemini veya Claude yedeği) yapılandırılmış mı? */
export function hasLlmProvider(): boolean {
  return !!geminiKey() || !!claudeKey();
}

/** Denenecek Gemini modelleri, sırayla (tekrarsız). */
export function geminiModels(): string[] {
  const primary = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  const fallback = process.env.GEMINI_FALLBACK_MODEL?.trim() || DEFAULT_GEMINI_FALLBACK_MODEL;
  return primary === fallback ? [primary] : [primary, fallback];
}

/**
 * Gemini generateContent çağrısı; model düşerse (404/429/5xx/ağ/zaman aşımı —
 * kısacası başarısız her durum) sıradaki modeli dener. İlk başarılı Response'u,
 * hiçbiri başarılı değilse SON Response'u döner (çağıran `.ok` kontrolünü
 * eskisi gibi yapar). Hepsi ağ hatasıyla düşerse son hatayı fırlatır.
 * API anahtarı URL'de değil başlıkta gider (hata/log çıktılarına sızmasın).
 */
export async function geminiFetch(body: unknown): Promise<Response> {
  const key = geminiKey();
  if (!key) throw new Error("No Gemini API key");

  let last: Response | null = null;
  let lastErr: unknown = null;
  for (const model of geminiModels()) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      });
      if (res.ok) return res;
      console.error(`[llm] Gemini ${model} başarısız: HTTP ${res.status}`);
      last = res;
    } catch (err) {
      console.error(`[llm] Gemini ${model} hata:`, err instanceof Error ? err.message : err);
      lastErr = err;
    }
  }
  if (last) return last;
  throw lastErr instanceof Error ? lastErr : new Error("Gemini isteği başarısız");
}

async function geminiText(system: string, user: string, maxTokens: number): Promise<string | null> {
  if (!geminiKey()) return null;
  try {
    const res = await geminiFetch({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: maxTokens },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const parts = (data.candidates?.[0]?.content?.parts ?? []) as { text?: string; thought?: boolean }[];
    const text = parts.filter((p) => typeof p.text === "string" && !p.thought).map((p) => p.text).join("").trim();
    return text || null;
  } catch {
    return null;
  }
}

async function claudeText(system: string, user: string, maxTokens: number): Promise<string | null> {
  const key = claudeKey();
  if (!key) return null;
  const model = process.env.CLAUDE_FALLBACK_MODEL?.trim() || DEFAULT_CLAUDE_FALLBACK_MODEL;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: user }],
        // Kısa müşteri yanıtı: düşünmeyi kapat + düşük efor (maliyet/gecikme).
        thinking: { type: "disabled" },
        output_config: { effort: "low" },
      }),
      signal: AbortSignal.timeout(CLAUDE_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[llm] Claude ${model} başarısız: HTTP ${res.status}`);
      return null;
    }
    const data = await res.json();
    const blocks = (data.content ?? []) as { type: string; text?: string }[];
    const text = blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
    return text || null;
  } catch (err) {
    console.error(`[llm] Claude ${model} hata:`, err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Düz metin yanıt üretir: Gemini (ana → yedek model) sonra, varsa, Claude.
 * Hiçbiri yanıt veremezse FIRLATIR — çağıranlar zaten statik yanıta düşüyor.
 */
export async function generateText(opts: { system: string; user: string; maxTokens: number }): Promise<string> {
  if (!hasLlmProvider()) throw new Error("No LLM provider configured");
  const viaGemini = await geminiText(opts.system, opts.user, opts.maxTokens);
  if (viaGemini) return viaGemini;
  const viaClaude = await claudeText(opts.system, opts.user, opts.maxTokens);
  if (viaClaude) {
    notifyLlmDegraded("Gemini yanıt vermedi, Claude yedeği devrede");
    return viaClaude;
  }
  notifyLlmDegraded("Gemini ve Claude yanıt vermedi — yapay zeka özellikleri statik yanıta düşüyor");
  throw new Error("LLM yanıt üretemedi");
}

// Sağlayıcı düştüğünde yöneticiye e-posta (sunucusuz örnek başına 3 saatte en çok 1). Asla fırlatmaz,
// yanıt akışını beklemez.
let lastLlmAlertAt = 0;
function notifyLlmDegraded(reason: string): void {
  const now = Date.now();
  if (now - lastLlmAlertAt < 3 * 60 * 60 * 1000) return;
  lastLlmAlertAt = now;
  const models = geminiModels().join(", ");
  import("@/lib/email/send")
    .then((m) =>
      m.sendOpsAlertEmail(
        "Yapay zeka sağlayıcı uyarısı",
        `${reason}.\n\nGemini modelleri: ${models}\nVercel loglarında "[llm]" satırlarına bakın; model adı GEMINI_MODEL / GEMINI_FALLBACK_MODEL env ile değiştirilebilir.`,
      ),
    )
    .catch(() => {});
}
