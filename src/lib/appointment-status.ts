/** Randevu durumu etiket ve renkleri — liste/detay/takvim arasında paylaşılır. */

export const STATUS_LABELS: Record<string, string> = {
  talep: "Bekliyor",
  onaylandi: "Onaylandı",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
  gelmedi: "Gelmedi",
};

/** dashboard.* çeviri anahtarları — t(STATUS_LABEL_KEYS[status]) ile kullanılır. */
export const STATUS_LABEL_KEYS: Record<string, string> = {
  talep: "statusTalep",
  onaylandi: "statusOnaylandi",
  tamamlandi: "statusTamamlandi",
  iptal: "statusIptal",
  gelmedi: "statusGelmedi",
};

export const STATUS_BADGE_CLASSES: Record<string, string> = {
  talep:      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300",
  onaylandi:  "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  tamamlandi: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  iptal:      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300",
  gelmedi:    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
};

/** Kapanmış (sonuçlanmış) durumlar — bir randevu bu durumlardan birine geçtikten
 *  sonra geri açılması "geriye dönük düzeltme" sayılır. */
export const TERMINAL_STATUSES = ["tamamlandi", "iptal", "gelmedi"] as const;

export function isTerminalStatus(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

/**
 * Bir durum değişikliğine izin var mı? Kapanmış (tamamlandı/iptal/gelmedi) bir
 * randevuyu başka bir duruma geri açmak — sahte işlem görüntüsünü önlemek için —
 * yalnızca personel dışındaki rollere (owner/manager) açık; personel bir kez
 * kapanan randevuyu geriye dönük değiştiremez. Kapanmamış bir randevuda ya da
 * hedef durum mevcut durumla aynıysa herkese açık (mevcut atama kontrolleri
 * ayrıca uygulanır).
 */
export function canChangeAppointmentStatus(
  role: string,
  currentStatus: string,
  newStatus: string
): boolean {
  if (currentStatus === newStatus) return true;
  if (isTerminalStatus(currentStatus) && role === "staff") return false;
  return true;
}
