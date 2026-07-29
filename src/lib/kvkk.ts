/**
 * Platform varsayılan KVKK aydınlatma metni — işletme kendi metnini
 * organizations.kvkk_notice_text alanına yazmadıysa bu kullanılır.
 * İşletme adı çalışma zamanında {salon} yerine geçirilir.
 */
export const DEFAULT_KVKK_NOTICE_TEMPLATE =
  "{salon} olarak, randevu talebiniz kapsamında ad, telefon ve e-posta bilgilerinizi " +
  "6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) uyarınca; randevu onayı, " +
  "hatırlatma ve iptal bildirimleri ile size özel teklif/kampanya duyuruları göndermek " +
  "amacıyla işleriz. Bilgileriniz yalnızca bu amaçlarla kullanılır ve üçüncü kişilerle " +
  "paylaşılmaz. Onayınızı istediğiniz zaman bizimle iletişime geçerek geri çekebilirsiniz.";

export function renderKvkkNotice(noticeText: string | null | undefined, salonName: string): string {
  return (noticeText?.trim() || DEFAULT_KVKK_NOTICE_TEMPLATE).replaceAll("{salon}", salonName);
}
