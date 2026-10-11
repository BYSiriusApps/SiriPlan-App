/**
 * Salon sahibi / personele giden bildirim metinleri (Telegram, serbest metin
 * WhatsApp, push) — alıcının diline göre.
 *
 * GÜVENLİK DUVARI: Tüm çok dillilik `NOTIFY_I18N=1` bayrağının arkasındadır.
 * Bayrak kapalıyken notify.ts her zaman "tr" ister ve `tr` tablosu, önceki
 * sabit metinlerle KARAKTER KARAKTER aynıdır — yani bayrak kapalıyken davranış
 * eskisiyle birebir aynıdır. Bilinmeyen/boş dil her zaman Türkçeye düşer; bu
 * modül hiçbir koşulda bir bildirimi gönderilemez hale getirmez.
 */

export type NotifyLocale = "tr" | "en" | "ru" | "ar" | "de" | "es";

const LOCALES: readonly NotifyLocale[] = ["tr", "en", "ru", "ar", "de", "es"];

export function notifyI18nEnabled(): boolean {
  return process.env.NOTIFY_I18N === "1";
}

/** Geçerli bir dil ise onu, değilse `fallback`'i (varsayılan Türkçe) döndürür. */
export function pickNotifyLocale(value: string | null | undefined, fallback: NotifyLocale = "tr"): NotifyLocale {
  return value && (LOCALES as readonly string[]).includes(value) ? (value as NotifyLocale) : fallback;
}

interface NotifyStrings {
  /** Tarih/saat ve sayı biçimlendirme yerel kodu. */
  intl: string;
  src: { web: string; whatsapp: string; instagram: string; tiktok: string; phone: string; walkin: string; manual: string };
  serviceFallback: string;
  staffFallback: string;
  confirmedTitle: string;
  requestTitle: string;
  requestFooter: string;
  lowStockTitle: string;
  lowStockBody: (stock: number, unit: string, min: number) => string;
  lowStockFooter: string;
  lowStockPush: (name: string, stock: number, unit: string) => string;
  acceptedTitle: string;
  acceptedNewTime: string;
  acceptedFooter: string;
  declinedTitle: string;
  declinedProposedTime: string;
  declinedFooter: string;
}

const tr: NotifyStrings = {
  intl: "tr-TR",
  src: {
    web: "🌐 Online Randevu Linki",
    whatsapp: "💬 WhatsApp",
    instagram: "📷 Instagram",
    tiktok: "🎵 TikTok",
    phone: "☎️ Telefon",
    walkin: "🏠 Yüz Yüze (Panel)",
    manual: "✍️ Manuel (Personel)",
  },
  serviceFallback: "Hizmet",
  staffFallback: "Personel",
  confirmedTitle: "Randevu Onaylandı",
  requestTitle: "Yeni Randevu Talebi",
  requestFooter: "Onaylamak için panele girin.",
  lowStockTitle: "Kritik Stok Uyarısı",
  lowStockBody: (n, u, m) => `Kalan: ${n} ${u} (uyarı sınırı: ${m})`,
  lowStockFooter: "Stok girişi yapmayı unutmayın.",
  lowStockPush: (name, n, u) => `${name} · Kalan: ${n} ${u}`,
  acceptedTitle: "Öneri Kabul Edildi",
  acceptedNewTime: "Yeni saat:",
  acceptedFooter: "Randevu otomatik onaylandı.",
  declinedTitle: "Öneri Reddedildi",
  declinedProposedTime: "Önerilen saat:",
  declinedFooter: "Talep hâlâ bekliyor — farklı bir saat önerin ya da iptal edin.",
};

const en: NotifyStrings = {
  intl: "en-GB",
  src: {
    web: "🌐 Online Booking Link",
    whatsapp: "💬 WhatsApp",
    instagram: "📷 Instagram",
    tiktok: "🎵 TikTok",
    phone: "☎️ Phone",
    walkin: "🏠 In Person (Panel)",
    manual: "✍️ Manual (Staff)",
  },
  serviceFallback: "Service",
  staffFallback: "Staff",
  confirmedTitle: "Appointment Confirmed",
  requestTitle: "New Appointment Request",
  requestFooter: "Open the panel to approve it.",
  lowStockTitle: "Low Stock Alert",
  lowStockBody: (n, u, m) => `Remaining: ${n} ${u} (alert limit: ${m})`,
  lowStockFooter: "Don't forget to restock.",
  lowStockPush: (name, n, u) => `${name} · Remaining: ${n} ${u}`,
  acceptedTitle: "Proposal Accepted",
  acceptedNewTime: "New time:",
  acceptedFooter: "The appointment was confirmed automatically.",
  declinedTitle: "Proposal Declined",
  declinedProposedTime: "Proposed time:",
  declinedFooter: "The request is still pending — propose a different time or cancel it.",
};

const ru: NotifyStrings = {
  intl: "ru-RU",
  src: {
    web: "🌐 Ссылка онлайн-записи",
    whatsapp: "💬 WhatsApp",
    instagram: "📷 Instagram",
    tiktok: "🎵 TikTok",
    phone: "☎️ Телефон",
    walkin: "🏠 Лично (панель)",
    manual: "✍️ Вручную (сотрудник)",
  },
  serviceFallback: "Услуга",
  staffFallback: "Сотрудник",
  confirmedTitle: "Запись подтверждена",
  requestTitle: "Новый запрос на запись",
  requestFooter: "Откройте панель, чтобы подтвердить.",
  lowStockTitle: "Критический остаток",
  lowStockBody: (n, u, m) => `Осталось: ${n} ${u} (порог уведомления: ${m})`,
  lowStockFooter: "Не забудьте пополнить запас.",
  lowStockPush: (name, n, u) => `${name} · Осталось: ${n} ${u}`,
  acceptedTitle: "Предложение принято",
  acceptedNewTime: "Новое время:",
  acceptedFooter: "Запись подтверждена автоматически.",
  declinedTitle: "Предложение отклонено",
  declinedProposedTime: "Предложенное время:",
  declinedFooter: "Запрос всё ещё ожидает — предложите другое время или отмените его.",
};

const ar: NotifyStrings = {
  intl: "ar",
  src: {
    web: "🌐 رابط الحجز الإلكتروني",
    whatsapp: "💬 WhatsApp",
    instagram: "📷 Instagram",
    tiktok: "🎵 TikTok",
    phone: "☎️ هاتف",
    walkin: "🏠 حضوري (اللوحة)",
    manual: "✍️ يدوي (موظف)",
  },
  serviceFallback: "خدمة",
  staffFallback: "موظف",
  confirmedTitle: "تم تأكيد الموعد",
  requestTitle: "طلب موعد جديد",
  requestFooter: "ادخل إلى اللوحة للموافقة.",
  lowStockTitle: "تنبيه نقص المخزون",
  lowStockBody: (n, u, m) => `المتبقي: ${n} ${u} (حد التنبيه: ${m})`,
  lowStockFooter: "لا تنسَ تسجيل إدخال المخزون.",
  lowStockPush: (name, n, u) => `${name} · المتبقي: ${n} ${u}`,
  acceptedTitle: "تم قبول الاقتراح",
  acceptedNewTime: "الوقت الجديد:",
  acceptedFooter: "تم تأكيد الموعد تلقائيًا.",
  declinedTitle: "تم رفض الاقتراح",
  declinedProposedTime: "الوقت المقترح:",
  declinedFooter: "الطلب لا يزال قيد الانتظار — اقترح وقتًا آخر أو ألغِه.",
};

const de: NotifyStrings = {
  intl: "de-DE",
  src: {
    web: "🌐 Online-Buchungslink",
    whatsapp: "💬 WhatsApp",
    instagram: "📷 Instagram",
    tiktok: "🎵 TikTok",
    phone: "☎️ Telefon",
    walkin: "🏠 Persönlich (Panel)",
    manual: "✍️ Manuell (Mitarbeitende)",
  },
  serviceFallback: "Leistung",
  staffFallback: "Mitarbeitende/r",
  confirmedTitle: "Termin bestätigt",
  requestTitle: "Neue Terminanfrage",
  requestFooter: "Zum Bestätigen im Panel anmelden.",
  lowStockTitle: "Warnung: Niedriger Bestand",
  lowStockBody: (n, u, m) => `Verbleibend: ${n} ${u} (Warngrenze: ${m})`,
  lowStockFooter: "Vergessen Sie nicht, den Bestand aufzufüllen.",
  lowStockPush: (name, n, u) => `${name} · Verbleibend: ${n} ${u}`,
  acceptedTitle: "Vorschlag angenommen",
  acceptedNewTime: "Neue Uhrzeit:",
  acceptedFooter: "Der Termin wurde automatisch bestätigt.",
  declinedTitle: "Vorschlag abgelehnt",
  declinedProposedTime: "Vorgeschlagene Uhrzeit:",
  declinedFooter: "Die Anfrage ist weiterhin offen – schlagen Sie eine andere Zeit vor oder stornieren Sie sie.",
};

const es: NotifyStrings = {
  intl: "es-ES",
  src: {
    web: "🌐 Enlace de reserva online",
    whatsapp: "💬 WhatsApp",
    instagram: "📷 Instagram",
    tiktok: "🎵 TikTok",
    phone: "☎️ Teléfono",
    walkin: "🏠 En persona (panel)",
    manual: "✍️ Manual (personal)",
  },
  serviceFallback: "Servicio",
  staffFallback: "Profesional",
  confirmedTitle: "Cita confirmada",
  requestTitle: "Nueva solicitud de cita",
  requestFooter: "Entra en el panel para aprobarla.",
  lowStockTitle: "Alerta de stock bajo",
  lowStockBody: (n, u, m) => `Quedan: ${n} ${u} (límite de alerta: ${m})`,
  lowStockFooter: "No olvides reponer el stock.",
  lowStockPush: (name, n, u) => `${name} · Quedan: ${n} ${u}`,
  acceptedTitle: "Propuesta aceptada",
  acceptedNewTime: "Nueva hora:",
  acceptedFooter: "La cita se confirmó automáticamente.",
  declinedTitle: "Propuesta rechazada",
  declinedProposedTime: "Hora propuesta:",
  declinedFooter: "La solicitud sigue pendiente: propón otra hora o cancélala.",
};

const TABLE: Record<NotifyLocale, NotifyStrings> = { tr, en, ru, ar, de, es };

export function notifyStrings(locale: NotifyLocale): NotifyStrings {
  return TABLE[locale] ?? tr;
}
