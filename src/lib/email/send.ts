import { Resend } from "resend";
import { emailStrings } from "@/lib/email/i18n";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@siriplan.com";

function emailEnabled() {
  const key = process.env.RESEND_API_KEY;
  return !!key && !key.includes("placeholder");
}

// Kullanıcı kaynaklı metinler (isim, salon adı vb.) HTML'e gömülmeden önce escape edilir
function esc(str: string) {
  return String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// From başlığındaki görünen ad; başlığı bozabilecek karakterler temizlenir
function fromName(name: string) {
  return String(name ?? "").replace(/[<>"\r\n;,]/g, "").trim() || "Siriplan";
}

export interface AppointmentEmailData {
  to: string;
  customerName: string;
  orgName: string;
  serviceName: string;
  staffName: string;
  appointmentAt: Date;
  cancelToken?: string;
  orgAddress?: string;
  locationUrl?: string;
  timeZone?: string;
  /** Müşterinin dili (customers.preferred_language). Verilmezse Türkçe — mevcut davranışın aynısı. */
  locale?: string | null;
}

function baseLayout(content: string, orgName: string, locale?: string | null) {
  const S = emailStrings(locale);
  return `<!DOCTYPE html>
<html lang="${S.htmlLang}"${S.rtl ? ' dir="rtl"' : ''}>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Siriplan</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#e11d48 0%,#a21caf 100%);padding:28px 32px;text-align:center;">
              <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Siriplan</span>
              <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.8);">${esc(orgName)}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                ${esc(S.footerNote(orgName))}<br/>
                <a href="https://siriplan.com" style="color:#e11d48;text-decoration:none;">siriplan.com</a>
                &nbsp;·&nbsp;
                <a href="https://bysirius.com" style="color:#9ca3af;text-decoration:none;">BY Sirius Group Ai & Technology Co Ltd.</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const DEFAULT_APPOINTMENT_TZ = "Europe/Istanbul";

// `{ timeZone }` kısayol (shorthand) söz dizimi KULLANILMIYOR — bu projenin
// Turbopack production minifier'ı parametre adını yeniden adlandırırken
// shorthand property'nin işaret ettiği değişkeni güncellemeyi atlayıp üretimde
// "ReferenceError: timeZone is not defined" üretiyor (bkz. lib/istanbul-time.ts
// başındaki not ve dee8ba0 numaralı düzeltme). Açık "timeZone: timeZone"
// yazımı bu hatayı tetiklemiyor.
function formatTR(date: Date, timeZone: string = DEFAULT_APPOINTMENT_TZ, locale?: string | null) {
  return date.toLocaleDateString(emailStrings(locale).intlLocale, { day: "numeric", month: "long", year: "numeric", timeZone: timeZone });
}
function formatTime(date: Date, timeZone: string = DEFAULT_APPOINTMENT_TZ, locale?: string | null) {
  return date.toLocaleTimeString(emailStrings(locale).intlLocale, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: timeZone });
}

export async function sendConfirmationEmail(data: AppointmentEmailData) {
  if (!emailEnabled()) return;
  const tz = data.timeZone || DEFAULT_APPOINTMENT_TZ;
  // Müşteriye giden metin müşterinin dilinde; dil yoksa Türkçe (eski davranış).
  const S = emailStrings(data.locale);
  const loc = data.locale;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://siriplan.com";
  const cancelLink = data.cancelToken
    ? `${appUrl}/r/iptal/${encodeURIComponent(data.cancelToken)}`
    : null;

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">${S.confirmTitle}</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">${S.confirmIntro(esc(data.customerName))}</p>

    <table role="presentation" width="100%" style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">${S.labelDate}</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${formatTR(data.appointmentAt, tz, loc)}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">${S.labelTime}</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${formatTime(data.appointmentAt, tz, loc)}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">${S.labelService}</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${esc(data.serviceName)}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">${S.labelStaff}</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${esc(data.staffName)}</span>
      </td></tr>
    </table>

    ${cancelLink ? `
    <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">
      ${S.confirmCancelHint}
    </p>
    <a href="${cancelLink}" style="display:inline-block;padding:10px 24px;background:#fee2e2;color:#dc2626;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;margin-bottom:20px;">
      ${S.cancelButton}
    </a>
    ` : ""}

    <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">
      ${S.confirmQuestions(esc(data.orgName))}<br/>
      ${S.confirmClosing}
    </p>
  `;

  await getResend().emails.send({
    from: `${fromName(data.orgName)} <${FROM}>`,
    to: data.to,
    subject: S.confirmSubject(formatTR(data.appointmentAt, tz, loc), formatTime(data.appointmentAt, tz, loc)),
    html: baseLayout(content, data.orgName, loc),
  });
}

export async function sendWelcomeEmail(data: { to: string; salonName: string; ownerName: string }) {
  if (!emailEnabled()) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://siriplan.com";

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Hoş Geldiniz! 🎉</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">
      Merhaba <strong>${esc(data.ownerName)}</strong>, <strong>${esc(data.salonName)}</strong> adına Siriplan'a hoş geldiniz!
    </p>

    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      14 günlük ücretsiz deneme süreniz başladı. Bu sürede Pro planın tüm özelliklerini keşfedebilirsiniz.
    </p>

    <table role="presentation" width="100%" style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="font-size:13px;font-weight:600;color:#111827;">✅ Yapabileceğiniz ilk adımlar:</span>
      </td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">• Hizmetlerinizi ve personellerinizi tanımlayın</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">• WhatsApp randevu linkini müşterilerinizle paylaşın</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">• Mevcut verilerinizi Excel'den aktarın</td></tr>
    </table>

    <a href="${appUrl}/dashboard"
       style="display:inline-block;padding:12px 28px;background:#e11d48;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:20px;">
      Dashboard'a Git →
    </a>

    <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">
      Herhangi bir sorunuz için <a href="mailto:info@bysirius.com" style="color:#e11d48;text-decoration:none;">info@bysirius.com</a> adresinden veya
      <a href="https://wa.me/905355032634" style="color:#25D366;text-decoration:none;">WhatsApp</a> üzerinden ulaşabilirsiniz.<br/>
      İyi çalışmalar! ✨
    </p>
  `;

  await getResend().emails.send({
    from: `Siriplan <${FROM}>`,
    to: data.to,
    subject: `Hoş Geldiniz ${data.salonName}! Siriplan'da 14 günlük ücretsiz denemeniz başladı`,
    html: baseLayout(content, "Siriplan"),
  });
}

export async function sendStaffInviteEmail(data: {
  to: string;
  orgName: string;
  inviteUrl: string;
  role: "staff" | "manager";
}) {
  if (!emailEnabled()) return;

  const roleLabel = data.role === "manager" ? "Yönetici" : "Personel";

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">🎉 İşletmeye Davet Edildiniz</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">
      <strong>${esc(data.orgName)}</strong> sizi Siriplan üzerinde <strong>${roleLabel.toLowerCase()}</strong> olarak davet etti.
    </p>

    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">
      Katılmak için aşağıdaki bağlantıya tıklayın — hesabınız yoksa orada birkaç adımda oluşturabilirsiniz.
    </p>

    <a href="${data.inviteUrl}"
       style="display:inline-block;padding:12px 28px;background:#e11d48;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:20px;">
      Daveti Görüntüle →
    </a>

    <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">
      Bu davet bağlantısı 7 gün geçerlidir. Sorularınız için <a href="mailto:info@bysirius.com" style="color:#e11d48;text-decoration:none;">info@bysirius.com</a> adresinden ulaşabilirsiniz.
    </p>
  `;

  await getResend().emails.send({
    from: `${fromName(data.orgName)} <${FROM}>`,
    to: data.to,
    subject: `${data.orgName} sizi Siriplan'a davet etti`,
    html: baseLayout(content, data.orgName),
  });
}

export async function sendBirthdayEmail(data: {
  to: string;
  customerName: string;
  orgName: string;
  bookingUrl: string;
  /** Müşterinin dili; verilmezse Türkçe (eski davranış). */
  locale?: string | null;
}) {
  if (!emailEnabled()) return;
  const S = emailStrings(data.locale);

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">${S.birthdayTitle}</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">
      ${S.birthdayIntro(esc(data.customerName), esc(data.orgName))}
    </p>

    <table role="presentation" width="100%" style="background:#fdf2f8;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;text-align:center;">
        <span style="font-size:15px;font-weight:600;color:#be185d;">${S.birthdayOffer}</span>
      </td></tr>
    </table>

    <a href="${data.bookingUrl}"
       style="display:inline-block;padding:12px 28px;background:#e11d48;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:20px;">
      ${S.birthdayCta}
    </a>

    <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">
      ${S.birthdayClosing}
    </p>
  `;

  await getResend().emails.send({
    from: `${fromName(data.orgName)} <${FROM}>`,
    to: data.to,
    subject: S.birthdaySubject(data.customerName, data.orgName),
    html: baseLayout(content, data.orgName, data.locale),
  });
}

export async function sendTrialEndingEmail(data: {
  to: string;
  orgName: string;
  ownerName?: string;
  daysLeft: number; // 2 = bitmeye 2 gün kala, 0 = bittiği gün
}) {
  if (!emailEnabled()) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://siriplan.com";
  const upgradeLink = `${appUrl}/auth/plan-sec`;
  const isToday = data.daysLeft <= 0;

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">
      ${isToday ? "⏳ Ücretsiz Deneme Süreniz Bugün Sona Eriyor" : "⏳ Ücretsiz Deneme Süreniz 2 Gün Sonra Sona Eriyor"}
    </h2>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">
      Merhaba ${data.ownerName ? `<strong>${esc(data.ownerName)}</strong>, ` : ""}<strong>${esc(data.orgName)}</strong> için 14 günlük ücretsiz deneme süreniz
      ${isToday ? "bugün doluyor." : "2 gün içinde dolacak."}
    </p>

    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">
      Randevu takviminize, müşteri kayıtlarınıza ve tüm verilerinize erişiminizin kesintisiz devam etmesi için
      bir plan seçmeniz yeterli — verileriniz güvende, hiçbir şey silinmiyor.
    </p>

    <a href="${upgradeLink}"
       style="display:inline-block;padding:12px 28px;background:#e11d48;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:20px;">
      siriplan.com'da Plan Seç →
    </a>

    <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">
      Sorularınız için <a href="mailto:info@bysirius.com" style="color:#e11d48;text-decoration:none;">info@bysirius.com</a> adresinden veya
      <a href="https://wa.me/905355032634" style="color:#25D366;text-decoration:none;">WhatsApp</a> üzerinden ulaşabilirsiniz.<br/>
      İyi çalışmalar! ✨
    </p>
  `;

  await getResend().emails.send({
    from: `Siriplan <${FROM}>`,
    to: data.to,
    subject: isToday
      ? `⏳ Deneme Süreniz Bugün Doluyor — ${data.orgName}`
      : `⏳ Deneme Süreniz 2 Gün Sonra Doluyor — ${data.orgName}`,
    html: baseLayout(content, "Siriplan"),
  });
}

export async function sendReminderEmail(data: AppointmentEmailData, hoursAway: number) {
  if (!emailEnabled()) return;
  const tz = data.timeZone || DEFAULT_APPOINTMENT_TZ;
  const S = emailStrings(data.locale);
  const loc = data.locale;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://siriplan.com";
  const cancelLink = data.cancelToken
    ? `${appUrl}/r/iptal/${encodeURIComponent(data.cancelToken)}`
    : null;
  // Randevu detay sayfası — WhatsApp buton hedefiyle aynı token'ı kullanır (bkz. /randevu/[token])
  const detailLink = data.cancelToken
    ? `${appUrl}/randevu/${encodeURIComponent(data.cancelToken)}`
    : null;
  const locationLink = data.locationUrl?.trim() || "";

  const isImminent = hoursAway <= 2;
  const isToday = hoursAway <= 12;

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">
      ${isImminent ? S.reminderTitleImminent : S.reminderTitle}
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      ${isImminent
        ? S.reminderIntroImminent(esc(data.customerName), hoursAway)
        : isToday
          ? S.reminderIntroToday(esc(data.customerName))
          : S.reminderIntroUpcoming(esc(data.customerName))
      }
    </p>

    <table role="presentation" width="100%" style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">${S.labelDate}</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${formatTR(data.appointmentAt, tz, loc)}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">${S.labelTime}</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${formatTime(data.appointmentAt, tz, loc)}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">${S.labelService}</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${esc(data.serviceName)}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">${S.labelStaff}</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${esc(data.staffName)}</span>
      </td></tr>
      ${locationLink ? `
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">${S.labelLocation}</span>
        <a href="${locationLink}" style="font-size:15px;font-weight:600;color:#e11d48;text-decoration:none;">${data.orgAddress ? esc(data.orgAddress) : S.viewOnMap}</a>
      </td></tr>
      ` : data.orgAddress ? `
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">${S.labelLocation}</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${esc(data.orgAddress)}</span>
      </td></tr>
      ` : ""}
    </table>

    ${detailLink ? `
    <a href="${detailLink}" style="display:inline-block;padding:10px 24px;background:#e11d48;color:#ffffff;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;margin-bottom:12px;margin-right:8px;">
      ${S.detailButton}
    </a>
    ` : ""}
    ${cancelLink ? `
    <a href="${cancelLink}" style="display:inline-block;padding:10px 24px;background:#fee2e2;color:#dc2626;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;margin-bottom:20px;">
      ${S.cancelButton}
    </a>
    ` : ""}

    <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">
      ${S.reminderClosing}
    </p>
  `;

  await getResend().emails.send({
    from: `${fromName(data.orgName)} <${FROM}>`,
    to: data.to,
    subject: isImminent
      ? S.reminderSubjectImminent(hoursAway, data.orgName)
      : S.reminderSubject(formatTR(data.appointmentAt, tz, loc), formatTime(data.appointmentAt, tz, loc), data.orgName),
    html: baseLayout(content, data.orgName, loc),
  });
}

/**
 * İletişim formundan gelen mesajı destek kutusuna iletir.
 *
 * NEDEN reply-to: Gönderen adresi doğrulanmamış kullanıcı girdisidir; `from`
 * olarak kullanılırsa Resend'in SPF/DKIM'i tutmaz ve mesaj spam'e düşer.
 * Bu yüzden `from` her zaman kendi alan adımız, ziyaretçinin adresi ise
 * `replyTo` — destek ekibi "Yanıtla"ya bastığında doğrudan ona gider.
 */
export async function sendContactMessageEmail(data: {
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  ip?: string | null;
  flags?: string[];
}) {
  if (!emailEnabled()) return;

  const to = process.env.CONTACT_NOTIFY_EMAIL ?? "info@bysirius.com";

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Yeni İletişim Mesajı</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">siriplan.com/iletisim formundan gönderildi.</p>

    <table role="presentation" width="100%" style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:20px;">
      <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Ad Soyad</td>
          <td style="padding:4px 0;font-size:13px;color:#111827;font-weight:600;">${esc(data.name)}</td></tr>
      <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">E-posta</td>
          <td style="padding:4px 0;font-size:13px;color:#111827;font-weight:600;">${esc(data.email)}</td></tr>
      ${data.phone ? `
      <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Telefon</td>
          <td style="padding:4px 0;font-size:13px;color:#111827;font-weight:600;">${esc(data.phone)}</td></tr>
      ` : ""}
      <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">Konu</td>
          <td style="padding:4px 0;font-size:13px;color:#111827;font-weight:600;">${esc(data.subject)}</td></tr>
      ${data.ip ? `
      <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">IP</td>
          <td style="padding:4px 0;font-size:13px;color:#111827;">${esc(data.ip)}</td></tr>
      ` : ""}
    </table>

    <div style="white-space:pre-wrap;font-size:14px;color:#374151;line-height:1.6;padding:16px;border-left:3px solid #e11d48;background:#fff1f2;border-radius:0 8px 8px 0;">${esc(data.message)}</div>

    ${data.flags?.length ? `
    <p style="margin:20px 0 0;font-size:12px;color:#b45309;background:#fffbeb;border-radius:8px;padding:12px;">
      ⚠️ Şüpheli sinyaller: ${esc(data.flags.join(", "))} — yanıtlamadan önce göz atın.
    </p>
    ` : ""}
  `;

  await getResend().emails.send({
    from: `Siriplan İletişim <${FROM}>`,
    to,
    replyTo: data.email,
    subject: `[İletişim] ${data.subject} — ${fromName(data.name)}`,
    html: baseLayout(content, "Siriplan"),
  });
}
