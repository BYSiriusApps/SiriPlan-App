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
  /** Ticari elektronik iletide zorunlu ret bilgisi (6563 m.9). */
  birthdayOptOut: string;
}

const tr: EmailStrings = {
  htmlLang: "tr", rtl: false, intlLocale: "tr-TR",
  labelDate: "📅 Tarih",
  labelTime: "🕐 Saat",
  labelService: "💇 Hizmet",
  labelStaff: "👤 Uzman",
  labelLocation: "📍 Konum",
  viewOnMap: "Haritada Görüntüle",
  footerNote: (org) => `Bu e-posta SiriPlan tarafından ${org} adına gönderilmiştir.`,
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
  birthdayOptOut: 'Bu tanıtım mesajlarını almak istemiyorsanız işletmeye "RET" yazmanız yeterlidir.',
};

const en: EmailStrings = {
  htmlLang: "en", rtl: false, intlLocale: "en-GB",
  labelDate: "📅 Date",
  labelTime: "🕐 Time",
  labelService: "💇 Service",
  labelStaff: "👤 Specialist",
  labelLocation: "📍 Location",
  viewOnMap: "View on Map",
  footerNote: (org) => `This email was sent by SiriPlan on behalf of ${org}.`,
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
  birthdayOptOut: 'If you no longer wish to receive these promotional messages, reply "STOP" to the business.',
};

const ru: EmailStrings = {
  htmlLang: "ru", rtl: false, intlLocale: "ru-RU",
  labelDate: "📅 Дата",
  labelTime: "🕐 Время",
  labelService: "💇 Услуга",
  labelStaff: "👤 Специалист",
  labelLocation: "📍 Адрес",
  viewOnMap: "Посмотреть на карте",
  footerNote: (org) => `Это письмо отправлено SiriPlan от имени ${org}.`,
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
  birthdayOptOut: 'Если вы больше не хотите получать рекламные сообщения, ответьте бизнесу «СТОП».',
};

const ar: EmailStrings = {
  htmlLang: "ar", rtl: true, intlLocale: "ar",
  labelDate: "📅 التاريخ",
  labelTime: "🕐 الوقت",
  labelService: "💇 الخدمة",
  labelStaff: "👤 الأخصائي",
  labelLocation: "📍 الموقع",
  viewOnMap: "عرض على الخريطة",
  footerNote: (org) => `أُرسل هذا البريد من SiriPlan نيابةً عن ${org}.`,
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
  birthdayOptOut: 'إذا لم تعد ترغب في تلقّي هذه الرسائل الترويجية، اكتب «إيقاف» للنشاط التجاري.',
};

const de: EmailStrings = {
  htmlLang: "de", rtl: false, intlLocale: "de-DE",
  labelDate: "📅 Datum",
  labelTime: "🕐 Uhrzeit",
  labelService: "💇 Leistung",
  labelStaff: "👤 Fachkraft",
  labelLocation: "📍 Ort",
  viewOnMap: "Auf der Karte ansehen",
  footerNote: (org) => `Diese E-Mail wurde von SiriPlan im Auftrag von ${org} gesendet.`,
  confirmTitle: "Ihr Termin ist bestätigt ✅",
  confirmIntro: (name) => `Guten Tag <strong>${name}</strong>, Ihr Termin wurde erfolgreich gebucht.`,
  confirmCancelHint: "Falls Sie nicht kommen können, stornieren Sie bitte mindestens 2 Stunden vorher:",
  cancelButton: "Termin stornieren",
  confirmQuestions: (org) => `Bei Fragen wenden Sie sich bitte an <strong>${org}</strong>.`,
  confirmClosing: "Einen schönen Tag! ✨",
  confirmSubject: (date, time) => `Ihr Termin ist bestätigt — ${date} ${time}`,
  reminderTitleImminent: "⏰ Ihr Termin steht bevor!",
  reminderTitle: "📅 Terminerinnerung",
  reminderIntroImminent: (name, h) => `Guten Tag <strong>${name}</strong>, Ihr Termin beginnt in <strong>${h} Std.</strong>!`,
  reminderIntroToday: (name) => `Guten Tag <strong>${name}</strong>, wir möchten Sie an Ihren heutigen Termin erinnern.`,
  reminderIntroUpcoming: (name) => `Guten Tag <strong>${name}</strong>, wir möchten Sie an Ihren bevorstehenden Termin erinnern.`,
  detailButton: "Termindetails ansehen",
  reminderClosing: "Wir freuen uns auf Sie! ✨",
  reminderSubjectImminent: (h, org) => `⏰ Ihr Termin beginnt in ${h} Std. — ${org}`,
  reminderSubject: (date, time, org) => `📅 Vergessen Sie Ihren Termin am ${date} ${time} nicht — ${org}`,
  birthdayTitle: "🎂 Alles Gute zum Geburtstag!",
  birthdayIntro: (name, org) => `Liebe/r <strong>${name}</strong>, das gesamte Team von <strong>${org}</strong> wünscht Ihnen einen wunderschönen Tag!`,
  birthdayOffer: "🎁 10 % Rabatt auf Ihren Besuch in diesem Monat!",
  birthdayCta: "Jetzt Termin buchen →",
  birthdayClosing: "Wir freuen uns auf Sie! ✨",
  birthdaySubject: (name, org) => `🎂 Alles Gute zum Geburtstag, ${name}! — ${org}`,
  birthdayWhatsApp: (name, org, url) =>
    `🎂 Alles Gute zum Geburtstag, ${name}!\n\nDas gesamte Team von ${org} denkt an Sie an Ihrem besonderen Tag.\n\nWir freuen uns, Sie zu begrüßen und Ihnen ein gutes Gefühl zu geben. Diesen Monat erhalten Sie 10 % Rabatt auf Ihren Besuch! 🎁\n\nTermin buchen: ${url}`,
  birthdayOptOut: 'Wenn Sie diese Werbenachrichten nicht mehr erhalten möchten, antworten Sie dem Unternehmen einfach mit „STOPP“.',
};

const es: EmailStrings = {
  htmlLang: "es", rtl: false, intlLocale: "es-ES",
  labelDate: "📅 Fecha",
  labelTime: "🕐 Hora",
  labelService: "💇 Servicio",
  labelStaff: "👤 Profesional",
  labelLocation: "📍 Ubicación",
  viewOnMap: "Ver en el mapa",
  footerNote: (org) => `Este correo fue enviado por SiriPlan en nombre de ${org}.`,
  confirmTitle: "Tu cita está confirmada ✅",
  confirmIntro: (name) => `Hola <strong>${name}</strong>, tu cita se ha reservado correctamente.`,
  confirmCancelHint: "Si no puedes venir, cancela al menos 2 horas antes:",
  cancelButton: "Cancelar cita",
  confirmQuestions: (org) => `Si tienes alguna pregunta, contacta con <strong>${org}</strong>.`,
  confirmClosing: "¡Que tengas un buen día! ✨",
  confirmSubject: (date, time) => `Tu cita está confirmada — ${date} ${time}`,
  reminderTitleImminent: "⏰ ¡Tu cita se acerca!",
  reminderTitle: "📅 Recordatorio de cita",
  reminderIntroImminent: (name, h) => `Hola <strong>${name}</strong>, ¡tu cita es en <strong>${h} h</strong>!`,
  reminderIntroToday: (name) => `Hola <strong>${name}</strong>, queremos recordarte tu cita de hoy.`,
  reminderIntroUpcoming: (name) => `Hola <strong>${name}</strong>, queremos recordarte tu próxima cita.`,
  detailButton: "Ver detalles de la cita",
  reminderClosing: "¡Te esperamos! ✨",
  reminderSubjectImminent: (h, org) => `⏰ Tu cita es en ${h} h — ${org}`,
  reminderSubject: (date, time, org) => `📅 No olvides tu cita del ${date} ${time} — ${org}`,
  birthdayTitle: "🎂 ¡Feliz cumpleaños!",
  birthdayIntro: (name, org) => `Querido/a <strong>${name}</strong>, todo el equipo de <strong>${org}</strong> te desea un día maravilloso.`,
  birthdayOffer: "🎁 ¡10 % de descuento en tu visita de este mes!",
  birthdayCta: "Reservar ahora →",
  birthdayClosing: "¡Estaremos encantados de verte! ✨",
  birthdaySubject: (name, org) => `🎂 ¡Feliz cumpleaños, ${name}! — ${org}`,
  birthdayWhatsApp: (name, org, url) =>
    `🎂 ¡Feliz cumpleaños, ${name}!\n\nTodo el equipo de ${org} está contigo en tu día especial.\n\nNos encantará recibirte y ayudarte a sentirte genial. ¡Este mes tienes un 10 % de descuento en tu visita! 🎁\n\nReserva aquí: ${url}`,
  birthdayOptOut: 'Si ya no deseas recibir estos mensajes promocionales, responde "BAJA" al negocio.',
};

const TABLE: Record<EmailLocale, EmailStrings> = { tr, en, ru, ar, de, es };

/** Verilen dilin metinleri; tanınmayan/boş dilde Türkçe döner. */
export function emailStrings(locale?: string | null): EmailStrings {
  return (locale && TABLE[locale as EmailLocale]) || tr;
}
