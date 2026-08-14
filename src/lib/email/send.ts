import { Resend } from "resend";

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
}

function baseLayout(content: string, orgName: string) {
  return `<!DOCTYPE html>
<html lang="tr">
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
                Bu e-posta Siriplan tarafından ${esc(orgName)} adına gönderilmiştir.<br/>
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

function formatTR(date: Date, timeZone: string = DEFAULT_APPOINTMENT_TZ) {
  return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone });
}
function formatTime(date: Date, timeZone: string = DEFAULT_APPOINTMENT_TZ) {
  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone });
}

export async function sendConfirmationEmail(data: AppointmentEmailData) {
  if (!emailEnabled()) return;
  const tz = data.timeZone || DEFAULT_APPOINTMENT_TZ;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://siriplan.com";
  const cancelLink = data.cancelToken
    ? `${appUrl}/r/iptal/${encodeURIComponent(data.cancelToken)}`
    : null;

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Randevunuz Onaylandı ✅</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">Merhaba <strong>${esc(data.customerName)}</strong>, randevunuz başarıyla oluşturuldu.</p>

    <table role="presentation" width="100%" style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">📅 Tarih</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${formatTR(data.appointmentAt, tz)}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">🕐 Saat</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${formatTime(data.appointmentAt, tz)}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">💇 Hizmet</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${esc(data.serviceName)}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">👤 Uzman</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${esc(data.staffName)}</span>
      </td></tr>
    </table>

    ${cancelLink ? `
    <p style="margin:0 0 16px;font-size:13px;color:#6b7280;">
      Gelemeseniz lütfen en geç 2 saat öncesinde iptal edin:
    </p>
    <a href="${cancelLink}" style="display:inline-block;padding:10px 24px;background:#fee2e2;color:#dc2626;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;margin-bottom:20px;">
      Randevuyu İptal Et
    </a>
    ` : ""}

    <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">
      Herhangi bir sorunuz için <strong>${esc(data.orgName)}</strong> ile iletişime geçin.<br/>
      İyi günler dileriz! ✨
    </p>
  `;

  await getResend().emails.send({
    from: `${fromName(data.orgName)} <${FROM}>`,
    to: data.to,
    subject: `Randevunuz Onaylandı — ${formatTR(data.appointmentAt, tz)} ${formatTime(data.appointmentAt, tz)}`,
    html: baseLayout(content, data.orgName),
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

export async function sendBirthdayEmail(data: {
  to: string;
  customerName: string;
  orgName: string;
  bookingUrl: string;
}) {
  if (!emailEnabled()) return;

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">🎂 Doğum Gününüz Kutlu Olsun!</h2>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">
      Sevgili <strong>${esc(data.customerName)}</strong>, <strong>${esc(data.orgName)}</strong> ailesi olarak bu özel gününüzü kutlarız!
    </p>

    <table role="presentation" width="100%" style="background:#fdf2f8;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;text-align:center;">
        <span style="font-size:15px;font-weight:600;color:#be185d;">🎁 Bu ay yapacağınız ziyarette size özel %10 indirim!</span>
      </td></tr>
    </table>

    <a href="${data.bookingUrl}"
       style="display:inline-block;padding:12px 28px;background:#e11d48;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;margin-bottom:20px;">
      Hemen Randevu Al →
    </a>

    <p style="margin:20px 0 0;font-size:13px;color:#6b7280;">
      Sizi misafir etmekten mutluluk duyarız! ✨
    </p>
  `;

  await getResend().emails.send({
    from: `${fromName(data.orgName)} <${FROM}>`,
    to: data.to,
    subject: `🎂 Doğum Gününüz Kutlu Olsun, ${data.customerName}! — ${data.orgName}`,
    html: baseLayout(content, data.orgName),
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
      ${isImminent ? "⏰ Randevunuz Yaklaşıyor!" : "📅 Randevu Hatırlatması"}
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;">
      Merhaba <strong>${esc(data.customerName)}</strong>,
      ${isImminent
        ? `randevunuz <strong>${hoursAway} saat</strong> sonra!`
        : isToday
          ? `bugünkü randevunuzu hatırlatmak istedik.`
          : `yaklaşan randevunuzu hatırlatmak istedik.`
      }
    </p>

    <table role="presentation" width="100%" style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">📅 Tarih</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${formatTR(data.appointmentAt, tz)}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">🕐 Saat</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${formatTime(data.appointmentAt, tz)}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">💇 Hizmet</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${esc(data.serviceName)}</span>
      </td></tr>
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">👤 Uzman</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${esc(data.staffName)}</span>
      </td></tr>
      ${locationLink ? `
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">📍 Konum</span>
        <a href="${locationLink}" style="font-size:15px;font-weight:600;color:#e11d48;text-decoration:none;">${data.orgAddress ? esc(data.orgAddress) : "Haritada Görüntüle"}</a>
      </td></tr>
      ` : data.orgAddress ? `
      <tr><td style="padding:6px 0;">
        <span style="font-size:12px;color:#9ca3af;display:block;margin-bottom:2px;">📍 Konum</span>
        <span style="font-size:15px;font-weight:600;color:#111827;">${esc(data.orgAddress)}</span>
      </td></tr>
      ` : ""}
    </table>

    ${detailLink ? `
    <a href="${detailLink}" style="display:inline-block;padding:10px 24px;background:#e11d48;color:#ffffff;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;margin-bottom:12px;margin-right:8px;">
      Randevu Detayını Görüntüle
    </a>
    ` : ""}
    ${cancelLink ? `
    <a href="${cancelLink}" style="display:inline-block;padding:10px 24px;background:#fee2e2;color:#dc2626;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none;margin-bottom:20px;">
      Randevuyu İptal Et
    </a>
    ` : ""}

    <p style="margin:16px 0 0;font-size:13px;color:#6b7280;">
      Sizi görmekten mutluluk duyacağız! ✨
    </p>
  `;

  await getResend().emails.send({
    from: `${fromName(data.orgName)} <${FROM}>`,
    to: data.to,
    subject: isImminent
      ? `⏰ Randevunuz ${hoursAway} Saat Sonra — ${data.orgName}`
      : `📅 ${formatTR(data.appointmentAt, tz)} ${formatTime(data.appointmentAt, tz)} Randevunuzu Unutmayın — ${data.orgName}`,
    html: baseLayout(content, data.orgName),
  });
}
