/** Kayıt ve Ayarlar'da işletme saat dilimi seçimi için kısa, kürasyonlu liste.
 * Varsayılan her zaman Europe/Istanbul — global işletmeler dilerse değiştirir. */
export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "Europe/Istanbul", label: "🇹🇷 İstanbul (GMT+3)" },
  { value: "Europe/London", label: "🇬🇧 Londra (GMT+0/+1)" },
  { value: "Europe/Berlin", label: "🇩🇪 Berlin, Paris, Madrid (GMT+1/+2)" },
  { value: "Europe/Moscow", label: "🇷🇺 Moskova (GMT+3)" },
  { value: "Asia/Dubai", label: "🇦🇪 Dubai (GMT+4)" },
  { value: "Asia/Baku", label: "🇦🇿 Bakü (GMT+4)" },
  { value: "Asia/Tbilisi", label: "🇬🇪 Tiflis (GMT+4)" },
  { value: "Asia/Riyadh", label: "🇸🇦 Riyad (GMT+3)" },
  { value: "Asia/Tashkent", label: "🇺🇿 Taşkent (GMT+5)" },
  { value: "Asia/Karachi", label: "🇵🇰 Karaçi (GMT+5)" },
  { value: "Asia/Kolkata", label: "🇮🇳 Yeni Delhi (GMT+5:30)" },
  { value: "Asia/Dhaka", label: "🇧🇩 Dakka (GMT+6)" },
  { value: "Asia/Bangkok", label: "🇹🇭 Bangkok, Cakarta (GMT+7)" },
  { value: "Asia/Shanghai", label: "🇨🇳 Pekin, Şangay (GMT+8)" },
  { value: "Asia/Tokyo", label: "🇯🇵 Tokyo (GMT+9)" },
  { value: "Australia/Sydney", label: "🇦🇺 Sidney (GMT+10/+11)" },
  { value: "Africa/Cairo", label: "🇪🇬 Kahire (GMT+2)" },
  { value: "Africa/Johannesburg", label: "🇿🇦 Johannesburg (GMT+2)" },
  { value: "America/New_York", label: "🇺🇸 New York (GMT-5/-4)" },
  { value: "America/Chicago", label: "🇺🇸 Chicago (GMT-6/-5)" },
  { value: "America/Denver", label: "🇺🇸 Denver (GMT-7/-6)" },
  { value: "America/Los_Angeles", label: "🇺🇸 Los Angeles (GMT-8/-7)" },
  { value: "America/Mexico_City", label: "🇲🇽 Mexico City (GMT-6)" },
  { value: "America/Sao_Paulo", label: "🇧🇷 São Paulo (GMT-3)" },
  { value: "UTC", label: "🌐 UTC" },
];

export const DEFAULT_TIMEZONE = "Europe/Istanbul";
