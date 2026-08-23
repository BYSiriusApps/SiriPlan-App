# 🛡️ Genel Yazılım Güvenliği & Sızma Testi Rehberi (Multi-Purpose Security Checklist)

Bu rehber, **Next.js, Node.js, Supabase/PostgreSQL, SaaS, PWA ve Web Uygulamalarında** veri sızıntılarını önlemek, multi-tenant (çok kiracılı) veri izolasyonunu sağlamak, bot/spam saldırılarını engellemek ve güvenlik açıklarını denetlemek için hazırlanmış çok amaçlı kontrol ve uygulama rehberidir.

---

## 📌 1. Kimlik Doğrulama & Oturum Güvenliği (Auth & Session Management)

- [ ] **Güçlü Parola Politikası:** Minimum 8 karakter, büyük/küçük harf, rakam ve özel karakter zorunluluğu.
- [ ] **Güvenli Çerez (Cookie) Yapılandırması:**
  - `HttpOnly: true` (JavaScript ile çerez okunmasını önler, XSS koruması).
  - `Secure: true` (Yalnızca HTTPS üzerinden iletilir).
  - `SameSite: Lax` veya `Strict` (CSRF saldırılarını engeller).
- [ ] **Token / Session Geçerlilik Süreleri:**
  - Access Token ömrü kısa tutulmalı (Örn: 15-60 dakika).
  - Refresh Token rotasyonu (Refresh Token Rotation) aktif edilmeli.
  - "Beni Hatırla" seçeneği işaretlenmediğinde oturum çerezleri geçici (session cookie) olarak yazılmalı.
- [ ] **Güvenli Şifre Sıfırlama Akışı:**
  - Şifre sıfırlama linkleri tek kullanımlık token (One-Time Token) içermeli ve süresi 15-30 dakikayla sınırlanmalı.
  - E-posta bulunamadığında dahi "Eğer e-posta adresi kayıtlıysa yönlendirme linki gönderildi" mesajı dönülerek kullanıcı varlığı saptama (User Enumeration) önlenmeli.

---

## 🔒 2. Çoklu Kiracı İzolasyonu & Yetkilendirme (Multi-Tenant & RBAC)

- [ ] **Veritabanı Seviyesinde RLS (Row Level Security):**
  - PostgreSQL / Supabase kullanılıyorsa **TÜM** tablolarda RLS aktif edilmeli.
  - Her tablo sorgusunda `org_id` / `tenant_id` zorunlu tutulmalı:
    ```sql
    CREATE POLICY "tenant_isolation" ON public.customers
      FOR ALL USING (org_id = current_setting('app.current_org_id')::uuid);
    ```
- [ ] **Service Role Key (Admin İstemci) Kullanım Kontrolü:**
  - RLS'i bypass eden `service_role` / `admin` yetkili istemciler yalnızca sunucu tarafında (Server API / Cron) kullanılmalı.
  - Admin istemci kullanıldığında yetkilendirme ve `org_id` kontrolü kod seviyesinde manuel olarak yapılmalı.
- [ ] **Yetki Yükseltme (Privilege Escalation) Koruması:**
  - Düşük rollü kullanıcıların (Personel/Staff) API üzerinden kendi rolünü yükseltmesi (`role = 'owner'`) engellenmeli.
  - Yetki güncelleme uçları (`PATCH /api/staff/[id]/permissions`) yalnızca işletme sahibine (`owner`) açık olmalı.
  - Kimse kendi yetki satırını aynı uçtan güncelleyememeli.
- [ ] **Hassas Veri Silme Kısıtı (Data Deletion Safeguard):**
  - Finansal hareket, randevu veya fatura geçmişi olan veriler veritabanından fiziki olarak silinmemeli (Soft Delete / Anonimleştirme uygulanmalı).

---

## 🤖 3. Bot, Spam & Otomatik Saldırı Engelleme (Bot Guard & Anti-Spam)

- [ ] **Honeypot Gizli Form Alanı:**
  - Formlara kullanıcıya görünmeyen CSS ile gizlenmiş bir alan (`website`, `hp_check`) eklenmeli.
  - Otomatik form doldurucu botlar bu alanı doldurduğunda istek anında reddedilmeli:
    ```typescript
    if (req.body.website && req.body.website.trim() !== "") {
      return res.status(400).json({ error: "Bot detected" });
    }
    ```
- [ ] **Form Doldurma Süresi Threshold'u (Timing Check):**
  - Form açılış zamanı (`form_started_at`) saklanmalı.
  - Gönderim süresi 2.5 saniyenin altındaysa istek script/bot kabul edilip elenmeli.
- [ ] **Tek Kullanımlık E-posta (Disposable Email) Engelleme:**
  - Sahte hesap açılışlarını önlemek için `mailinator.com`, `10minutemail.com`, `tempmail.com` vb. alan adları engellenmeli.
- [ ] **SEO Link Spam Filtresi:**
  - Not/mesaj alanlarına giren `[url]`, `http://`, `https://`, `viagra`, `casino` kalıpları regex ile taranmalı.
- [ ] **Dinamik Hız Sınırlayıcı (Rate Limiting):**
  - IP ve Kullanıcı/Telefon bazlı sliding-window sınırlaması (Örn: Giriş denemeleri için 1 dakikada maks 5 istek, randevu oluşturma için 1 saatte maks 10 istek).
- [ ] **CAPTCHA & Tor Guard:**
  - Kritik halka açık formlarda Cloudflare Turnstile / reCAPTCHA v3 entegre edilmeli.
  - Tor çıkış düğümlerinden (Tor Exit Nodes) gelen şüpheli anonim trafik filtrelenmeli.

---

## 🌐 4. Tarayıcı & Ağ Güvenliği (Security Headers & CSP)

- [ ] **Content Security Policy (CSP):**
  - Dinamik `nonce` kullanımı: Sayfa içi script'ler `nonce-${random_base64}` ile imzalanmalı.
  - Panel ve oturumlu alanlarda `'unsafe-inline'` ve `'unsafe-eval'` kesinlikle kaldırılmalı.
  - Örnek CSP Başlığı:
    ```http
    Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-xyz' 'strict-dynamic'; frame-ancestors 'self'; object-src 'none'; upgrade-insecure-requests;
    ```
- [ ] **Zorunlu Güvenlik Başlıkları (HTTP Headers):**
  - `X-Content-Type-Options: nosniff` (MIME sniffer engelleme)
  - `X-Frame-Options: SAMEORIGIN` veya `frame-ancestors 'self'` (Clickjacking koruması)
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (HSTS)
- [ ] **Sunucu İmza Gizleme:**
  - `X-Powered-By: Next.js` veya `Server: Express` gibi sunucu imza başlıkları kaldırılmalı (`poweredByHeader: false`).

---

## 🔑 5. Veri Sızıntısı & Gizli Anahtar Yönetimi (Data Leakage & Secrets)

- [ ] **İstemci Paketi (Client Bundle) Kontrolü:**
  - `NEXT_PUBLIC_` veya istemciye açık değişkenlerde **kesinlikle** `SERVICE_ROLE_KEY`, `DATABASE_URL`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY` taşınmamalı.
- [ ] **Herkese Açık API Uçlarında Kolon Beyaz Listesi (Whitelist):**
  - Salon / Profil / Mağaza detaylarını dönen herkese açık API'lerde veritabanı objesi doğrudan `res.json(data)` şeklinde dönülmemeli.
  - Yanıt verisi kolon filtrelemesinden geçirilmeli (`wa_token`, `sms_password`, `google_calendar_token` dışarı sızmamalı).
- [ ] **Cross-Origin Write (CSRF) Engelleyici:**
  - Yalnızca eşleşen `Origin` başlığına sahip POST/PUT/PATCH/DELETE isteklerine izin verilmeli:
    ```typescript
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.nextUrl.host) {
      return res.status(403).json({ error: "Cross-origin request blocked" });
    }
    ```

---

## 📱 6. PWA & Mobil Mağaza Uyumluluk Kontrolü

- [ ] **Web App Manifest (`manifest.json`):**
  - `name`, `short_name`, `start_url`, `display: "standalone"`, `background_color`, `theme_color` tanımlı olmalı.
  - En az 192x192 ve 512x512 PNG formatında `purpose: "any"` ve `purpose: "maskable"` ikonları bulunmalı.
  - Mobil/Masaüstü `screenshots` tanımlanmalı.
- [ ] **Service Worker (`sw.js`):**
  - `fetch` olay dinleyicisi barındıran aktif bir service worker bulunmalı ve kök HTML'de kaydedilmeli.
- [ ] **Digital Asset Links (`.well-known/assetlinks.json`):**
  - Android TWA (Trusted Web Activity) / Play Store uygulaması için SHA-256 parmak izi tanımlanmalı.

---

## 🧪 7. Otomatik Sızma Testi Betiği Taslağı (Test Script Template)

Diğer projelerinizde `node security-test.mjs` yazarak koşturabileceğiniz test yapısı örneği:

```javascript
// security-test.mjs
import fetch from "node:fetch";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

async function testSecurity() {
  console.log("🛡️ Güvenlik ve İzolasyon Testi Başlatılıyor:", BASE_URL);

  // 1. Anonim Erişim Testi
  const anonRes = await fetch(`${BASE_URL}/api/admin/users`);
  console.log(anonRes.status === 401 || anonRes.status === 403 ? "✓ Admin API korumalı" : "❌ SIZINTI: Admin API anonim erişime açık!");

  // 2. CSRF Origin Testi
  const csrfRes = await fetch(`${BASE_URL}/api/user/update`, {
    method: "POST",
    headers: { "Origin": "https://evil-attacker.com", "Content-Type": "application/json" },
    body: JSON.stringify({ name: "hacked" })
  });
  console.log(csrfRes.status === 403 ? "✓ CSRF Koruması Aktif" : "❌ SIZINTI: Yabancı Origin kabul edildi!");
}

testSecurity();
```
