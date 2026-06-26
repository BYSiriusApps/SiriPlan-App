# randevu-sistemi - Kurulum Rehberi

## 1. Proje Hazırlığı

- Klasör: `randevu-sistemi`
- Temel dosyalar: `CLAUDE.md`, `kur.md`, `page.json`
- Gerekirse: `package.json`, `src/`, `public/`

## 2. Dosya Yapısı

- `page.json`
- `src/index.html`
- `src/appointments.js`
- `public/styles.css`
- `.env`

## 3. Örnek page.json

```json
{
  "name": "randevu-sistemi",
  "displayName": "Randevu Sistemi",
  "type": "web-app",
  "description": "Randevu rezervasyonu ve takvim yönetimi için proje iskeleti.",
  "entry": "src/index.html",
  "route": "/",
  "pages": [
    {
      "id": "appointments",
      "title": "Randevular",
      "route": "/",
      "component": "AppointmentsPage"
    }
  ]
}
```

## 4. Örnek package.json

```json
{
  "name": "randevu-sistemi",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## 5. Çalıştırma

- `npm install`
- `npm run dev`

## 6. Notlar

- Randevu slotları için `src` içinde bileşenler ekleyin.
