# 06 — Kuaför / Berber / Güzellik Salonu Randevu Sistemi

> Online randevu + çalışan takvimi + WhatsApp hatırlatma + sadakat kartı. Salonun Instagram'dan gelen "randevu var mı" sorularını bitirir.

## Proje Özeti

Lokal kuaför/berber/güzellik salonu için:
- Online randevu formu (hizmet → çalışan → saat seç)
- Her çalışanın ayrı takvimi (manikürist, berber, cilt uzmanı)
- 24 saat + 2 saat önce WhatsApp hatırlatma
- Sadakat kartı: 10 saç kesiminde 11'si bedava (müşteri QR taratır)
- Instagram yorumlar/DM → "randevu al" otomatik yanıt
- Admin: günlük takvim + ciro takibi

**Son kullanıcı:** 1-5 çalışanlı salon (kuaför, berber, güzellik, tırnak, kaş).

## Hedef Müşteri

- Kuaför salonu sahibi (kadın + erkek + unisex)
- Berber (erkek saç + sakal)
- Güzellik merkezi (cilt, lazer, epilasyon)
- Tırnak / kaş salonu

Hepsinde ortak: **randevu bazlı**, müşteri adım atmadan gelmiyor, Instagram DM'den randevu soruluyor.

## Fiyat Modeli

- **Temel:** $500 + $100/ay — randevu sistemi + WhatsApp hatırlatma
- **Plus:** $700 + $150/ay — + sadakat kartı + IG auto-reply
- **Pro:** $900 + $200/ay — + multi-şube + ciro dashboard + personel ücret takip

## Teknoloji Yığını

```json
{
  "base": "Mikro SaaS Başlangıç (spec 01)",
  "whatsapp": "Meta WhatsApp Business Cloud API",
  "instagram": "Meta Instagram Graph API",
  "qr": "qrcode npm",
  "ai": "Claude Haiku 4.5 (IG reply)",
  "sms": "NetGSM veya Twilio (backup)"
}
```

## .env Değişkenleri

```
# WhatsApp
WHATSAPP_META_TOKEN=EAAxxx
WHATSAPP_PHONE_NUMBER_ID=xxx

# Instagram (aynı Meta app)
INSTAGRAM_PAGE_ID=xxx
INSTAGRAM_PAGE_ACCESS_TOKEN=xxx

# AI
ANTHROPIC_API_KEY=sk-ant-xxx

# Salon
NEXT_PUBLIC_SALON_NAME=Elegans Kuaför
NEXT_PUBLIC_SALON_TYPE=kuafor  # kuafor|berber|guzellik
NEXT_PUBLIC_SALON_PHONE=+905551234567
NEXT_PUBLIC_SALON_ADDRESS=xxx
NEXT_PUBLIC_SALON_MAPS=xxx
NEXT_PUBLIC_SALON_INSTAGRAM=@elegans
SALON_WORKING_HOURS_START=09:00
SALON_WORKING_HOURS_END=20:00
SALON_CLOSED_DAYS=0  # 0=Pazar, virgüllü liste

# Sadakat
LOYALTY_PUNCHES_NEEDED=10  # kaç işlemde 1 bedava

CRON_SECRET=random
```

## Veritabanı Şeması

```typescript
import {
  pgTable, text, timestamp, uuid, integer, numeric,
  boolean, jsonb, date, index, uniqueIndex
} from "drizzle-orm/pg-core";

export const staff = pgTable("staff", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(), // "Kuaför", "Berber", "Cilt Uzmanı"
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  isActive: boolean("is_active").default(true).notNull(),
  workingDays: jsonb("working_days").$type<number[]>().default([1, 2, 3, 4, 5, 6]), // 0=Pazar
  startTime: text("start_time").default("09:00"),
  endTime: text("end_time").default("20:00"),
  commissionRate: numeric("commission_rate", { precision: 3, scale: 2 }).default("0.4"),
  displayOrder: integer("display_order").default(0),
});

export const services = pgTable("services", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // "Saç Kesimi", "Lazer Epilasyon"
  description: text("description"),
  durationMinutes: integer("duration_minutes").default(30).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  categoryTag: text("category_tag"), // "sac", "cilt", "tirnak"
  contributesToLoyalty: boolean("contributes_to_loyalty").default(true).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: integer("display_order").default(0),
});

// Hangi staff hangi service'i yapabilir
export const staffServices = pgTable("staff_services", {
  staffId: uuid("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  serviceId: uuid("service_id").notNull().references(() => services.id, { onDelete: "cascade" }),
}, (t) => ({
  pk: uniqueIndex("staff_services_pk").on(t.staffId, t.serviceId),
}));

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  birthDate: date("birth_date"),
  notes: text("notes"),     // "saç tipi kıvırcık", "koku alerjisi"
  loyaltyPunches: integer("loyalty_punches").default(0),
  loyaltyRedeems: integer("loyalty_redeems").default(0),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  phoneIdx: uniqueIndex("customers_phone_idx").on(t.phone),
}));

export const appointments = pgTable("appointments", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").references(() => customers.id),
  customerName: text("customer_name").notNull(), // snapshot (müşteri yeni ise henüz customers row yok)
  customerPhone: text("customer_phone").notNull(),

  staffId: uuid("staff_id").notNull().references(() => staff.id),
  serviceId: uuid("service_id").notNull().references(() => services.id),
  appointmentAt: timestamp("appointment_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),

  status: text("status", {
    enum: ["talep", "onaylandi", "tamamlandi", "iptal", "gelmedi"]
  }).default("talep").notNull(),
  source: text("source", {
    enum: ["web", "whatsapp", "instagram", "telefon", "yuzyuze"]
  }).notNull(),

  note: text("note"),
  internalNote: text("internal_note"),
  tip: numeric("tip", { precision: 10, scale: 2 }).default("0"),
  paymentMethod: text("payment_method"), // "nakit", "kart", "online"

  reminderSentAt: timestamp("reminder_sent_at"),
  secondReminderSentAt: timestamp("second_reminder_sent_at"),
  loyaltyPunchAdded: boolean("loyalty_punch_added").default(false),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  staffDateIdx: index("appointments_staff_date_idx").on(t.staffId, t.appointmentAt),
  statusIdx: index("appointments_status_idx").on(t.status),
}));

export const loyaltyRedeems = pgTable("loyalty_redeems", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  appointmentId: uuid("appointment_id").references(() => appointments.id),
  punchesUsed: integer("punches_used").default(10),
  redeemedAt: timestamp("redeemed_at").defaultNow().notNull(),
});
```

## Sayfa Yapısı

```
app/
├── page.tsx                              # Landing (hizmetler, takım, "Randevu al" CTA, IG feed)
├── hizmetler/page.tsx                    # Hizmet listesi + fiyat
├── ekibimiz/page.tsx                     # Staff bio + fotoğraf
├── randevu/page.tsx                      # Randevu formu (3 adım)
├── sadakat/[phone]/page.tsx              # Müşteri kendi sadakat durumu (public, phone'la)
├── admin/
│   ├── page.tsx                          # Bugünkü takvim + ciro
│   ├── takvim/page.tsx                   # Haftalık takvim tüm staff
│   ├── appointments/page.tsx             # Liste + filter
│   ├── appointments/[id]/page.tsx        # Detay + tamamla/iptal
│   ├── customers/page.tsx                # Müşteri veritabanı
│   ├── customers/[id]/page.tsx           # Müşteri detay + geçmiş randevular
│   ├── staff/page.tsx                    # Staff yönetim + takvim
│   ├── services/page.tsx                 # Hizmet + fiyat
│   └── ayarlar/page.tsx                  # Salon ayarları
└── api/
    ├── appointments/route.ts             # POST + GET
    ├── appointments/[id]/route.ts        # PATCH (complete, cancel)
    ├── appointments/[id]/complete/route.ts # POST: status + loyalty punch + Ciro
    ├── availability/route.ts             # POST {staffId, serviceId, date} → slots
    ├── customers/loyalty/route.ts        # GET by phone → durum
    ├── instagram/webhook/route.ts        # IG DM gelen
    ├── instagram/verify/route.ts
    └── cron/reminder/route.ts            # 24h + 2h cron
```

## Randevu Akışı (Online)

`app/randevu/page.tsx` — 3-step client form:

**Step 1 — Hizmet**
Hizmetleri grid'de göster (kategori bazlı tab: Saç, Cilt, Tırnak)
Her kartta: isim, süre, fiyat, "Seç" butonu

**Step 2 — Çalışan + Saat**
- Seçilen hizmeti yapan staff'lar listelenir (staff_services join)
- Staff seçilince `POST /api/availability {staffId, serviceId, date}` çağrılır
- 7 günlük müsait slotlar grid halinde (gün başlık, slotlar aşağıda)
- Müsait olmayan slotlar disabled

**Step 3 — Müşteri Bilgisi**
- İsim (required)
- Telefon (required, `+90...` format)
- Email (optional)
- Not (textarea)
- "Randevuyu Onayla" → `POST /api/appointments`

Başarılı sayfa: tebrik + takvime ekle linki (.ics download) + iptal linki (uuid token ile)

## API: Availability

`POST /api/availability`:

```typescript
import { addMinutes, startOfDay, endOfDay, addDays, format } from "date-fns";

export async function POST(req: Request) {
  const { staffId, serviceId, date } = await req.json(); // date: "2026-04-24"

  const [s, svc] = await Promise.all([
    db.select().from(staff).where(eq(staff.id, staffId)).limit(1),
    db.select().from(services).where(eq(services.id, serviceId)).limit(1),
  ]);
  if (!s[0] || !svc[0]) return Response.json({ error: "not found" }, { status: 404 });

  const dayOfWeek = new Date(date).getDay();
  if (!s[0].workingDays!.includes(dayOfWeek)) {
    return Response.json({ slots: [] });
  }

  const startTime = s[0].startTime; // "09:00"
  const endTime = s[0].endTime;     // "20:00"
  const duration = svc[0].durationMinutes;

  const dayStart = new Date(`${date}T${startTime}:00`);
  const dayEnd = new Date(`${date}T${endTime}:00`);

  // Bu gün bu staff'ın olan randevuları
  const existing = await db.select().from(appointments).where(and(
    eq(appointments.staffId, staffId),
    gte(appointments.appointmentAt, dayStart),
    lte(appointments.appointmentAt, dayEnd),
    notInArray(appointments.status, ["iptal"]),
  ));

  // 30 dk step'lerde gel, çakışmayanları dön
  const slots: string[] = [];
  for (let t = dayStart; addMinutes(t, duration) <= dayEnd; t = addMinutes(t, 30)) {
    const slotStart = t.getTime();
    const slotEnd = addMinutes(t, duration).getTime();

    const conflict = existing.some(a => {
      const aStart = a.appointmentAt.getTime();
      const aEnd = aStart + a.durationMinutes * 60000;
      return !(slotEnd <= aStart || slotStart >= aEnd);
    });
    if (!conflict && slotStart > Date.now()) {
      slots.push(format(t, "HH:mm"));
    }
  }

  return Response.json({ slots });
}
```

## Loyalty Sistem

Her tamamlanan randevuda (service.contributesToLoyalty=true) müşterinin `loyaltyPunches`'ı +1.

`POST /api/appointments/[id]/complete`:
1. Status → "tamamlandi"
2. Customer yoksa (phone ile) yarat, varsa update
3. Service.contributesToLoyalty ise `customers.loyaltyPunches += 1`
4. Eğer `loyaltyPunches >= LOYALTY_PUNCHES_NEEDED` → WhatsApp mesaj:
   ```
   Tebrikler! {{LOYALTY_PUNCHES_NEEDED}} işleminizi tamamladınız.
   Bir sonraki ziyaretinizde [hizmet] bedava — {{name}}!
   ```
5. Ciro dashboard: Total += service.price + tip

Müşteri public sayfa `/sadakat/{phone}` → punches / needed ilerleme barı.

## Instagram AI Auto-Reply

`app/api/instagram/webhook/route.ts`:

Gelen DM'ler → AI ile sınıflandır → cevapla:

```typescript
const IG_REPLY_PROMPT = `
Sen ${SALON_NAME} salonunun IG asistanısın. Kısa ve samimi Türkçe yanıtla.

Hizmetlerimiz: ${services}
Randevu almak için: ${APP_URL}/randevu
Adres: ${ADDRESS}
Fiyat: ${services_with_prices}

Kurallar:
- Fiyat sorusu → fiyat ver + randevu linki
- Randevu isteği → link yolla
- Şikayet/özel konu → "arkadaşlarım ilgileniyor, DM'den yazabilirsiniz"
- Max 2 cümle, emoji az

Çıktı: sadece cevap metni.
`;
```

## Cron: Hatırlatma

`app/api/cron/reminder/route.ts`:

24 saat öncesi + 2 saat öncesi iki ayrı query, iki ayrı WhatsApp template.

```
Yarın 14:30'da {{staffName}} ile {{serviceName}} randevunuz var.
📍 {{salonAddress}}
İptal/değişiklik için yazın.
```

2 saat önce:
```
{{salonName}} — {{time}} randevunuz. Bekliyoruz!
```

## Admin Takvim

`app/admin/takvim/page.tsx`:
- Hafta görünümü (Pzt-Pzr)
- Her sütun bir gün, her satır 30 dk slot
- Staff sütunları yan yana (kendi renkte)
- Randevu bloğu tıkla → detay modal
- Sürükle-bırak (opsiyonel advanced) randevuyu değiştirebilir

Filter: staff bazlı, servis bazlı.

## Ciro / Analytics

`app/admin/page.tsx` dashboard:
- Bugün ciro (tamamlanan randevu * price + tip)
- Bu hafta ciro (gün bazlı chart)
- Staff bazlı ciro (bar chart)
- En popüler hizmetler (son 30 gün)
- Yeni müşteri sayısı (son 30 gün)
- No-show oranı

## Kabul Kriterleri

- [ ] `/randevu` — 3 adım, sadece müsait slotlar seçilebiliyor
- [ ] Aynı staff'a çakışan randevu denendi → backend 409 ile reddediyor
- [ ] Müşteri tamamlandı → loyaltyPunches +1, 10'a ulaşınca tebrik WA
- [ ] Müsteri gelmedi statüsü → otomatik ertesi gün mesaj
- [ ] IG test mesajı: "fiyat ne" → AI cevap gönderildi
- [ ] Admin takvim → bugünkü 5 randevu haftalık grid'de
- [ ] Staff randevusunu ertele → müşteriye otomatik bildirim

## Build Sırası

1. Spec 01 base
2. Schema + seed (4 staff, 15 service, staff_services mapping, 20 customers)
3. Landing + hizmetler + ekibimiz
4. `/randevu` 3-step form
5. `POST /api/availability` slot üretimi
6. `POST /api/appointments` çakışma kontrolü
7. Admin takvim (haftalık grid)
8. `/admin/appointments/[id]` tamamla → loyalty + ciro
9. `/sadakat/[phone]` public
10. Cron hatırlatma + WhatsApp
11. IG webhook + AI reply
12. Analytics dashboard
13. End-to-end test

## Önemli Uyarılar

- **Çakışma mantığı** — staff bazlı zaman aralığı, iptal olmayanları bak
- **Phone primary key** — customer unique phone, müşteri 2 kere randevu alırsa aynı kayda bağlanmalı
- **Loyalty fraud** — complete sadece admin yapabilir, kendi kendine "tamamlandı" değil
- **IG rate limit** — Meta IG DM'de 10 mesaj/saniye limit, queue kullan
- **KVKK** — müşteri doğum tarihi optional, forceful sorma
- **No-show flag** — randevudan 15 dk sonra status "onaylandı" ise otomatik "gelmedi" iş (Vercel cron)
