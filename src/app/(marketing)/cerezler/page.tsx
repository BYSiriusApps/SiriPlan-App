import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Çerez Politikası",
  description: "Siriplan çerez politikası — çerezlerin nasıl kullanıldığını öğrenin.",
};

export default function CerezlerPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Çerez Politikası</h1>
      <p className="text-sm text-muted-foreground mb-10">Son güncelleme: Ocak 2026</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">

        <section>
          <h2 className="text-xl font-semibold mb-3">1. Çerez Nedir?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Çerezler (cookies), web siteleri tarafından tarayıcınıza yerleştirilen küçük metin dosyalarıdır.
            Siriplan platformu, daha iyi bir kullanıcı deneyimi sunmak ve hizmet kalitesini artırmak amacıyla çerezlerden faydalanır.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Kullandığımız Çerez Türleri</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-sm mb-1">Zorunlu Çerezler</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Platformun temel işlevleri için gereklidir. Oturum yönetimi, güvenlik doğrulaması ve tercih kaydetme bu kategoride yer alır.
                Bu çerezler devre dışı bırakılamaz.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">Analitik Çerezler</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Platform kullanımını ölçmek ve hizmetleri iyileştirmek amacıyla anonim istatistikler toplar.
                Hangi sayfaların en çok ziyaret edildiğini anlamamıza yardımcı olur.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-1">İşlevsellik Çerezleri</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Dil tercihi, tema seçimi (koyu/açık mod) gibi kişiselleştirme ayarlarınızı hatırlamak için kullanılır.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Çerez Yönetimi</h2>
          <p className="text-muted-foreground leading-relaxed">
            Tarayıcı ayarlarınızdan çerezleri engelleyebilir veya silebilirsiniz. Ancak zorunlu çerezlerin engellenmesi
            platformun düzgün çalışmasını olumsuz etkileyebilir.
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2 text-sm">
            <li>Chrome: Ayarlar → Gizlilik ve Güvenlik → Çerezler</li>
            <li>Firefox: Tercihler → Gizlilik ve Güvenlik</li>
            <li>Safari: Tercihler → Gizlilik</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Üçüncü Taraf Çerezler</h2>
          <p className="text-muted-foreground leading-relaxed">
            Ödeme altyapısı (Stripe) gibi üçüncü taraf hizmet sağlayıcılar kendi çerezlerini yerleştirebilir.
            Bu çerezler ilgili sağlayıcının gizlilik politikasına tabidir.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. İletişim</h2>
          <p className="text-muted-foreground leading-relaxed">
            Çerez politikamıza ilişkin sorularınız için: <strong>privacy@bysirius.com</strong>
          </p>
        </section>

      </div>
    </div>
  );
}
