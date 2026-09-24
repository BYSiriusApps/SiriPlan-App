/**
 * CSV/Excel'de "=", "+", "-", "@" veya sekme/CR ile başlayan bir hücre, dosya
 * açılırken formül olarak çalıştırılabilir (CSV/Formula Injection, CWE-1236).
 * Veri göçü sayfasından içe aktarılan müşteri adı/notu/e-postası salonun
 * kontrolünde olmayan bir dosyadan (rakip yazılım exportu, e-posta ile gelen
 * dosya) gelebiliyor; bu alanlar sonradan CSV/Excel olarak dışa aktarılıp
 * Excel'de açıldığında `=cmd|...`, `=HYPERLINK(...)` gibi bir "müşteri adı"
 * çalıştırılabilir kod veya veri sızdıran bağlantıya dönüşür. Başına tek
 * tırnak eklemek Excel/Sheets/LibreOffice'e hücreyi düz metin olarak
 * göstermesini söyler; görünen değer değişmez.
 */
const DANGEROUS_PREFIX = /^[=+\-@\t\r]/;

export function safeCell(value: unknown): string {
  const s = String(value ?? "");
  return DANGEROUS_PREFIX.test(s) ? `'${s}` : s;
}
