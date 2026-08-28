# Supabase Auth E-postaları — SiriPlan markası

Kayıt doğrulama ve **şifre sıfırlama** e-postaları Resend'den değil, Supabase'in
kendi e-posta servisinden gider. Bu yüzden varsayılan hâlde:

- Gönderen: `noreply@mail.app.supabase.io`
- İçerik: markasız "Reset your password" şablonu

Bu **test hesabına özel değil** — her kullanıcı aynı e-postayı alır. Düzeltmek
için Supabase panelinde 3 ayar yapılır (kod tarafı zaten hazır).

---

## 1) URL Configuration (linkin ana sayfaya düşmesini engeller)

**Dashboard → Authentication → URL Configuration**

- **Site URL:** `https://siriplan.com`
- **Redirect URLs** listesine ekle:
  - `https://siriplan.com/**`
  - `http://localhost:3000/**` (geliştirme)

> Link tıklanınca ana sayfa (`siriplan.com`) açılıyorsa sebebi neredeyse her
> zaman budur: `redirect_to` beyaz listede olmadığında Supabase sessizce Site
> URL'ye düşer. Aşağıdaki şablon `{{ .SiteURL }}` kullandığı için beyaz liste
> takılması olmadan da çalışır, ama yine de eklenmesi önerilir.

---

## 2) Reset Password şablonu (marka + doğru link)

**Dashboard → Authentication → Email Templates → "Reset Password"**

- **Subject:** `SiriPlan — Şifre sıfırlama bağlantınız`
- **Message body (Source / HTML):** aşağıdaki bloğun tamamını yapıştır.

Kritik nokta: link `{{ .SiteURL }}/auth/yeni-sifre?token_hash={{ .TokenHash }}&type=recovery`
biçiminde. `/auth/yeni-sifre` sayfası bu token'ı doğrulayıp oturumu kurar
(kod tarafı: `src/app/auth/yeni-sifre/page.tsx`). `{{ .ConfirmationURL }}`
KULLANMA — o, cihazlar arası çalışmayan PKCE `?code` akışına gider.

```html
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SiriPlan — Şifre sıfırlama</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
          <tr>
            <td style="background:linear-gradient(135deg,#e11d48 0%,#a21caf 100%);padding:28px 32px;text-align:center;">
              <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">SiriPlan</span>
              <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.8);">Salon &amp; randevu yönetimi</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Şifrenizi sıfırlayın</h2>
              <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
                SiriPlan hesabınız (<strong>{{ .Email }}</strong>) için bir şifre
                sıfırlama talebi aldık. Yeni şifrenizi belirlemek için aşağıdaki
                butona tıklayın.
              </p>
              <a href="{{ .SiteURL }}/auth/yeni-sifre?token_hash={{ .TokenHash }}&type=recovery"
                 style="display:inline-block;padding:12px 28px;background:#e11d48;color:#ffffff;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
                Yeni şifre belirle →
              </a>
              <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
                Buton çalışmıyorsa bu bağlantıyı tarayıcınıza yapıştırın:<br/>
                <span style="color:#e11d48;word-break:break-all;">{{ .SiteURL }}/auth/yeni-sifre?token_hash={{ .TokenHash }}&type=recovery</span>
              </p>
              <p style="margin:20px 0 0;font-size:13px;color:#9ca3af;line-height:1.6;">
                Bu bağlantı 1 saat geçerlidir ve yalnızca bir kez kullanılabilir.
                Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz —
                şifreniz değişmez.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                Bu e-posta SiriPlan tarafından gönderildi.<br/>
                <a href="https://siriplan.com" style="color:#e11d48;text-decoration:none;">siriplan.com</a>
                &nbsp;·&nbsp;
                <a href="https://bysirius.com" style="color:#9ca3af;text-decoration:none;">BY Sirius Group Ai &amp; Technology Co Ltd.</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

Aynı gövdeyi **"Confirm signup"** şablonuna da uygulayabilirsin; orada link:
`{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/auth/plan-sec`
(not: callback route şu an yalnızca `?code` işliyor — signup şablonunu
değiştireceksen önce route'a `token_hash` desteği eklenmeli).

---

## 3) Gönderen adresi: `noreply@siriplan.com` (Custom SMTP)

Şablonu değiştirmek içeriği markalı yapar ama **gönderen hâlâ**
`noreply@mail.app.supabase.io` görünür. Bunu düzeltmek için:

**Dashboard → Project Settings → Authentication → SMTP Settings → Enable Custom SMTP**

Resend'in SMTP'si (zaten Resend hesabı var, `RESEND_API_KEY`):

| Alan | Değer |
|------|-------|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | `RESEND_API_KEY` değeri |
| Sender email | `noreply@siriplan.com` |
| Sender name | `SiriPlan` |

`siriplan.com` alan adı Resend'de zaten doğrulanmış (transactional e-postalar
oradan gidiyor), ek DNS kaydı gerekmez.

> Custom SMTP'de Supabase'in ücretsiz katmanı saatte ~30 e-posta ile sınırlıdır;
> Resend'e geçince bu sınır Resend planına göre belirlenir.

---

## Kod tarafında ne yapıldı (28 Ağu 2026)

- `src/app/auth/yeni-sifre/page.tsx` artık linki açıldığında token'ı kendisi
  doğruluyor: `?token_hash&type` → `verifyOtp`, `?code` → `exchangeCodeForSession`,
  `#access_token` → istemci otomatik. Süresi dolmuş/geçersiz linkte "yeni
  bağlantı iste" ekranı gösteriyor, artık sessizce ana sayfaya düşmüyor.
- `src/app/auth/sifre-sifirla/page.tsx` `redirectTo` artık `/auth/callback` yerine
  doğrudan `/auth/yeni-sifre`.
