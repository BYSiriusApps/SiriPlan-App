import { after } from "next/server";
import { sendInternalTemplate } from "@/lib/wa-templates/internal-send";
import { WA_INTERNAL_TEMPLATES, type WaInternalPurpose } from "@/lib/wa-templates/internal-registry";

type OnboardingPurpose = Extract<WaInternalPurpose, "hosgeldin" | "deneme_2gun" | "deneme_bitti">;

/** Kullanıcının dilinde onaylı şablon var mı? (yoksa Türkçe mesaj yabancıya gitmesin) */
function hasTemplateFor(purpose: OnboardingPurpose, locale: string): boolean {
  const def = WA_INTERNAL_TEMPLATES[purpose];
  switch (locale) {
    case "tr":
      return !!def.metaName;
    case "en":
      return !!def.metaNameEn;
    case "ru":
      return !!def.metaNameRu;
    case "ar":
      return !!def.metaNameAr;
    case "de":
      return !!(def.metaNameDe && process.env.WA_TEMPLATES_DE_ES === "1");
    case "es":
      return !!(def.metaNameEs && process.env.WA_TEMPLATES_DE_ES === "1");
    default:
      return false;
  }
}

/**
 * Yeni kayıt / deneme hatırlatma WhatsApp'ı. Asla fırlatmaz; telefon yoksa, dilde onaylı
 * şablon yoksa ya da gönderim reddedilirse sessizce false döner (kayıt akışı etkilenmez).
 */
export async function sendOnboardingWa(
  phone: string | null | undefined,
  purpose: OnboardingPurpose,
  params: Record<string, string>,
  locale: string | null | undefined
): Promise<boolean> {
  try {
    const loc = (locale ?? "tr").toLowerCase();
    if (!phone || !hasTemplateFor(purpose, loc)) return false;
    return await sendInternalTemplate(phone, purpose, params, loc);
  } catch (e) {
    console.error(`[wa-onboarding] ${purpose} gönderilemedi`, e);
    return false;
  }
}

/** Yanıt döndükten sonra (serverless'ta kesilmeden) gönderir. */
export function sendOnboardingWaAfter(...args: Parameters<typeof sendOnboardingWa>): void {
  try {
    after(() => sendOnboardingWa(...args));
  } catch {
    void sendOnboardingWa(...args);
  }
}
