"use client";

/**
 * Footer'daki "Çerez ayarları" bağlantısı. localStorage'daki onay kaydını
 * ("cookie_consent", bkz. CookieConsent.tsx) siler ve sayfayı yeniler; böylece
 * onay bandı yeniden görünür ve kullanıcı Kabul/Reddet seçimini değiştirebilir.
 * KVKK/GDPR: rızanın geri alınması, verilmesi kadar kolay olmalıdır.
 */
export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="text-xs text-muted-foreground hover:text-foreground transition-colors text-left"
      onClick={() => {
        try {
          window.localStorage.removeItem("cookie_consent");
        } catch {
          /* private mode / storage disabled — sayfa yenilemesi yine de bandı gösterir */
        }
        window.location.reload();
      }}
    >
      {label}
    </button>
  );
}
