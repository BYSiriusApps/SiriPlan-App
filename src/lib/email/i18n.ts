/**
 * Müşteriye giden randevu e-postalarının (onay + hatırlatma) metinleri.
 *
 * NEDEN next-intl DEĞİL: hatırlatma e-postaları pg_cron/Vercel cron'undan,
 * yani istek bağlamı (request scope) OLMADAN gönderilir — next-intl'in
 * getTranslations()'ı orada çalışmaz. Bu yüzden metinler bu dosyada,
 * bağımsız ve senkron bir tablo olarak durur.
 *
 * Dil bulunamazsa her zaman Türkçeye düşülür; yani bu tablo bir bildirimi
 * asla gönderilemez hale getiremez.
 */

import type { LanguageCode } from "@/lib/languages";

export type EmailLocale = LanguageCode;

interface EmailStrings {
  /** HTML lang/dir — Arapça için sağdan sola. */
  htmlLang: string;
  rtl: boolean;
  /** Tarih/saat biçimlendirmesinde kullanılacak Intl yerel kodu. */
  intlLocale: string;

  labelDate: string;
  labelTime: string;
  labelService: string;
  labelStaff: string;
  labelLocation: string;
  viewOnMap: string;
  footerNote: (org: string) => string;

  // Onay
  confirmTitle: string;
  confirmIntro: (name: string) => string;
  confirmCancelHint: string;
  cancelButton: string;
  confirmQuestions: (org: string) => string;
  confirmClosing: string;
  confirmSubject: (date: string, time: string) => string;

  // Hatırlatma
  reminderTitleImminent: string;
  reminderTitle: string;
  reminderIntroImminent: (name: string, hours: number) => string;
  reminderIntroToday: (name: string) => string;
  reminderIntroUpcoming: (name: string) => string;
  detailButton: string;
  reminderClosing: string;
  reminderSubjectImminent: (hours: number, org: string) => string;
  reminderSubject: (date: string, time: string, org: string) => string;

  // Doğum günü (e-posta + serbest metin WhatsApp)
  birthdayTitle: string;
  birthdayIntro: (name: string, org: string) => string;
  birthdayOffer: string;
  birthdayCta: string;
  birthdayClosing: string;
  birthdaySubject: (name: string, org: string) => string;
  /** WhatsApp serbest metni — şablon değil, düz mesaj. */
  birthdayWhatsApp: (name: string, org: string, url: string) => string;
}

const tr: EmailStrings = {
  htmlLang: "tr", rtl: false, intlLocale: "tr-TR",
  labelDate: "📅 Tarih",
  labelTime: "🕐 Saat",
  labelService: "💇 Hizmet",
  labelStaff: "👤 Uzman",
  labelLocation: "📍 Konum",
  viewOnMap: "Haritada Görüntüle",
  footerNote: (org) => `Bu e-posta Siriplan tarafından ${org} adına gönderilmiştir.`,
  confirmTitle: "Randevunuz Onaylandı ✅",
  confirmIntro: (name) => `Merhaba <strong>${name}</strong>, randevunuz başarıyla oluşturuldu.`,
  confirmCancelHint: "Gelemeseniz lütfen en geç 2 saat öncesinde iptal edin:",
  cancelButton: "Randevuyu İptal Et",
  confirmQuestions: (org) => `Herhangi bir sorunuz için <strong>${org}</strong> ile iletişime geçin.`,
  confirmClosing: "İyi günler dileriz! ✨",
  confirmSubject: (date, time) => `Randevunuz Onaylandı — ${date} ${time}`,
  reminderTitleImminent: "⏰ Randevunuz Yaklaşıyor!",
  reminderTitle: "📅 Randevu Hatırlatması",
  reminderIntroImminent: (name, h) => `Merhaba <strong>${name}</strong>, randevunuz <strong>${h} saat</strong> sonra!`,
  reminderIntroToday: (name) => `Merhaba <strong>${name}</strong>, bugünkü randevunuzu hatırlatmak istedik.`,
  reminderIntroUpcoming: (name) => `Merhaba <strong>${name}</strong>, yaklaşan randevunuzu hatırlatmak istedik.`,
  detailButton: "Randevu Detayını Görüntüle",
  reminderClosing: "Sizi görmekten mutluluk duyacağız! ✨",
  reminderSubjectImminent: (h, org) => `⏰ Randevunuz ${h} Saat Sonra — ${org}`,
  reminderSubject: (date, time, org) => `📅 ${date} ${time} Randevunuzu Unutmayın — ${org}`,
  birthdayTitle: "🎂 Doğum Gününüz Kutlu Olsun!",
  birthdayIntro: (name, org) => `Sevgili <strong>${name}</strong>, <strong>${org}</strong> ailesi olarak bu özel gününüzü kutlarız!`,
  birthdayOffer: "🎁 Bu ay yapacağınız ziyarette size özel %10 indirim!",
  birthdayCta: "Hemen Randevu Al →",
  birthdayClosing: "Sizi misafir etmekten mutluluk duyarız! ✨",
  birthdaySubject: (name, org) => `🎂 Doğum Gününüz Kutlu Olsun, ${name}! — ${org}`,
  birthdayWhatsApp: (name, org, url) =>
    `🎂 Doğum günün kutlu olsun, ${name}!\n\n${org} ailesi olarak bu özel günde yanındayız.\n\nSeni misafir etmek ve güzel hissettirmek isteriz. Bu ay yapacağın ziyarette sana özel %10 indirim sunuyoruz! 🎁\n\nRandevu için: ${url}`,
};

const en: EmailStrings = {
  htmlLang: "en", rtl: false, intlLocale: "en-GB",
  labelDate: "📅 Date",
  labelTime: "🕐 Time",
  labelService: "💇 Service",
  labelStaff: "👤 Specialist",
  labelLocation: "📍 Location",
  viewOnMap: "View on Map",
  footerNote: (org) => `This email was sent by Siriplan on behalf of ${org}.`,
  confirmTitle: "Your Appointment Is Confirmed ✅",
  confirmIntro: (name) => `Hi <strong>${name}</strong>, your appointment has been booked successfully.`,
  confirmCancelHint: "If you can't make it, please cancel at least 2 hours in advance:",
  cancelButton: "Cancel Appointment",
  confirmQuestions: (org) => `For any questions, please contact <strong>${org}</strong>.`,
  confirmClosing: "Have a great day! ✨",
  confirmSubject: (date, time) => `Your Appointment Is Confirmed — ${date} ${time}`,
  reminderTitleImminent: "⏰ Your Appointment Is Coming Up!",
  reminderTitle: "📅 Appointment Reminder",
  reminderIntroImminent: (name, h) => `Hi <strong>${name}</strong>, your appointment is in <strong>${h} hours</strong>!`,
  reminderIntroToday: (name) => `Hi <strong>${name}</strong>, this is a reminder about your appointment today.`,
  reminderIntroUpcoming: (name) => `Hi <strong>${name}</strong>, this is a reminder about your upcoming appointment.`,
  detailButton: "View Appointment Details",
  reminderClosing: "We look forward to seeing you! ✨",
  reminderSubjectImminent: (h, org) => `⏰ Your Appointment Is In ${h} Hours — ${org}`,
  reminderSubject: (date, time, org) => `📅 Don't Forget Your Appointment on ${date} ${time} — ${org}`,
  birthdayTitle: "🎂 Happy Birthday!",
  birthdayIntro: (name, org) => `Dear <strong>${name}</strong>, everyone at <strong>${org}</strong> wishes you a wonderful day!`,
  birthdayOffer: "🎁 Enjoy 10% off your visit this month!",
  birthdayCta: "Book Now →",
  birthdayClosing: "We'd love to see you! ✨",
  birthdaySubject: (name, org) => `🎂 Happy Birthday, ${name}! — ${org}`,
  birthdayWhatsApp: (name, org, url) =>
    `🎂 Happy birthday, ${name}!\n\nEveryone at ${org} is thinking of you on your special day.\n\nWe'd love to welcome you and help you feel your best. Enjoy 10% off your visit this month! 🎁\n\nBook here: ${url}`,
};

const ru: EmailStrings = {
  htmlLang: "ru", rtl: false, intlLocale: "ru-RU",
  labelDate: "📅 Дата",
  labelTime: "🕐 Время",
  labelService: "💇 Услуга",
  labelStaff: "👤 Специалист",
  labelLocation: "📍 Адрес",
  viewOnMap: "Посмотреть на карте",
  footerNote: (org) => `Это письмо отправлено Siriplan от имени ${org}.`,
  confirmTitle: "Ваша запись подтверждена ✅",
  confirmIntro: (name) => `Здравствуйте, <strong>${name}</strong>! Ваша запись успешно создана.`,
  confirmCancelHint: "Если не сможете прийти, отмените запись не позднее чем за 2 часа:",
  cancelButton: "Отменить запись",
  confirmQuestions: (org) => `По любым вопросам обращайтесь в <strong>${org}</strong>.`,
  confirmClosing: "Хорошего дня! ✨",
  confirmSubject: (date, time) => `Ваша запись подтверждена — ${date} ${time}`,
  reminderTitleImminent: "⏰ Ваша запись уже скоро!",
  reminderTitle: "📅 Напоминание о записи",
  reminderIntroImminent: (name, h) => `Здравствуйте, <strong>${name}</strong>! Ваша запись через <strong>${h} ч.</strong>`,
  reminderIntroToday: (name) => `Здравствуйте, <strong>${name}</strong>! Напоминаем о вашей сегодняшней записи.`,
  reminderIntroUpcoming: (name) => `Здравствуйте, <strong>${name}</strong>! Напоминаем о вашей предстоящей записи.`,
  detailButton: "Посмотреть детали записи",
  reminderClosing: "Будем рады вас видеть! ✨",
  reminderSubjectImminent: (h, org) => `⏰ Ваша запись через ${h} ч. — ${org}`,
  reminderSubject: (date, time, org) => `📅 Не забудьте о записи ${date} ${time} — ${org}`,
  birthdayTitle: "🎂 С днём рождения!",
  birthdayIntro: (name, org) => `Дорогой(ая) <strong>${name}</strong>, весь коллектив <strong>${org}</strong> поздравляет вас с этим особенным днём!`,
  birthdayOffer: "🎁 Скидка 10% на визит в этом месяце!",
  birthdayCta: "Записаться →",
  birthdayClosing: "Будем рады вас видеть! ✨",
  birthdaySubject: (name, org) => `🎂 С днём рождения, ${name}! — ${org}`,
  birthdayWhatsApp: (name, org, url) =>
    `🎂 С днём рождения, ${name}!\n\nВесь коллектив ${org} поздравляет вас в этот особенный день.\n\nБудем рады видеть вас и помочь вам выглядеть прекрасно. В этом месяце для вас скидка 10%! 🎁\n\nЗапись: ${url}`,
};

const ar: EmailStrings = {
  htmlLang: "ar", rtl: true, intlLocale: "ar",
  labelDate: "📅 التاريخ",
  labelTime: "🕐 الوقت",
  labelService: "💇 الخدمة",
  labelStaff: "👤 الأخصائي",
  labelLocation: "📍 الموقع",
  viewOnMap: "عرض على الخريطة",
  footerNote: (org) => `أُرسل هذا البريد من Siriplan نيابةً عن ${org}.`,
  confirmTitle: "تم تأكيد موعدك ✅",
  confirmIntro: (name) => `مرحبًا <strong>${name}</strong>، تم إنشاء موعدك بنجاح.`,
  confirmCancelHint: "إذا تعذّر حضورك، يُرجى الإلغاء قبل ساعتين على الأقل:",
  cancelButton: "إلغاء الموعد",
  confirmQuestions: (org) => `لأي استفسار، يُرجى التواصل مع <strong>${org}</strong>.`,
  confirmClosing: "نتمنى لك يومًا سعيدًا! ✨",
  confirmSubject: (date, time) => `تم تأكيد موعدك — ${date} ${time}`,
  reminderTitleImminent: "⏰ اقترب موعدك!",
  reminderTitle: "📅 تذكير بالموعد",
  reminderIntroImminent: (name, h) => `مرحبًا <strong>${name}</strong>، موعدك بعد <strong>${h} ساعات</strong>!`,
  reminderIntroToday: (name) => `مرحبًا <strong>${name}</strong>، نذكّرك بموعدك اليوم.`,
  reminderIntroUpcoming: (name) => `مرحبًا <strong>${name}</strong>، نذكّرك بموعدك القادم.`,
  detailButton: "عرض تفاصيل الموعد",
  reminderClosing: "يسعدنا لقاؤك! ✨",
  reminderSubjectImminent: (h, org) => `⏰ موعدك بعد ${h} ساعات — ${org}`,
  reminderSubject: (date, time, org) => `📅 لا تنسَ موعدك في ${date} ${time} — ${org}`,
  birthdayTitle: "🎂 عيد ميلاد سعيد!",
  birthdayIntro: (name, org) => `عزيزي/عزيزتي <strong>${name}</strong>، يهنئك فريق <strong>${org}</strong> بهذا اليوم المميز!`,
  birthdayOffer: "🎁 خصم 10% على زيارتك هذا الشهر!",
  birthdayCta: "احجز الآن →",
  birthdayClosing: "يسعدنا استقبالك! ✨",
  birthdaySubject: (name, org) => `🎂 عيد ميلاد سعيد يا ${name}! — ${org}`,
  birthdayWhatsApp: (name, org, url) =>
    `🎂 عيد ميلاد سعيد يا ${name}!\n\nفريق ${org} يشاركك هذا اليوم المميز.\n\nيسعدنا استقبالك ومساعدتك على الشعور بأفضل حال. لك خصم 10% على زيارتك هذا الشهر! 🎁\n\nللحجز: ${url}`,
};

const TABLE: Record<EmailLocale, EmailStrings> = { tr, en, ru, ar };

/** Verilen dilin metinleri; tanınmayan/boş dilde Türkçe döner. */
export function emailStrings(locale?: string | null): EmailStrings {
  return (locale && TABLE[locale as EmailLocale]) || tr;
}
