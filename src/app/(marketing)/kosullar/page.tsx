import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kullanım Koşulları",
  description: "Siriplan kullanım koşulları ve hizmet şartları.",
};

export default function KosullarPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Kullanım Koşulları</h1>
      <p className="text-sm text-muted-foreground mb-10">Son güncelleme: Ocak 2026</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">

        <section>
          <h2 className="text-xl font-semibold mb-3">1. Taraflar ve Kapsam</h2>
          <p className="text-muted-foreground leading-relaxed">
            Bu Kullanım Koşulları, <strong>BY Sirius Group Ai & Technology Co Ltd.</strong> ("Siriplan", "biz") ile
            platformu kullanan bireyler ve işletmeler ("Kullanıcı") arasındaki hukuki ilişkiyi düzenler.
            Platformu kullanarak bu koşulları kabul etmiş sayılırsınız.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Hizmet Tanımı</h2>
          <p className="text-muted-foreground leading-relaxed">
            Siriplan; randevu yönetimi, müşteri takibi, personel yönetimi, kampanya modülü ve ciro raporlaması
            gibi işletme yönetim araçları sunan SaaS (Hizmet Olarak Yazılım) platformudur.
            Platform erişimi seçilen abonelik planı kapsamında sağlanır.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Kullanıcı Yükümlülükleri</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Platforma yalnızca yetkili kişilerin erişim sağlamasından siz sorumlusunuz.</li>
            <li>Hesap bilgilerinizi gizli tutmak zorundasınız.</li>
            <li>Platform yasadışı, yanıltıcı veya zararlı amaçlarla kullanılamaz.</li>
            <li>Müşteri verilerini yalnızca hizmet sunumu amacıyla işleyebilirsiniz.</li>
            <li>KVKK ve diğer ilgili mevzuata uyum sağlamak kullanıcının sorumluluğundadır.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Ücretlendirme ve Abonelik</h2>
          <p className="text-muted-foreground leading-relaxed">
            Abonelik ücretleri seçilen plana göre aylık veya yıllık olarak tahsil edilir.
            Yıllık planda %18 indirim uygulanır. Deneme süresi sonunda ücretlendirme başlar;
            istediğiniz zaman iptal edebilirsiniz. İptal sonrası mevcut dönem sonuna kadar erişim devam eder.
            İade politikamız için support@bysirius.com ile iletişime geçebilirsiniz.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Hizmet Kesintileri ve Sorumluluk Sınırları</h2>
          <p className="text-muted-foreground leading-relaxed">
            Platform %99,9 uptime hedefiyle çalışır; ancak bakım veya teknik nedenlerle kısa süreli
            kesintiler yaşanabilir. BY Sirius Group Ai & Technology Co Ltd., dolaylı, arızi veya sonuçta ortaya çıkan zararlardan
            sorumlu tutulamaz. Sorumluluğumuz, ilgili ay içinde ödediğiniz abonelik ücretiyle sınırlıdır.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Fikri Mülkiyet</h2>
          <p className="text-muted-foreground leading-relaxed">
            Platform, tasarım ve yazılımının tüm fikri mülkiyet hakları BY Sirius Group Ai & Technology Co Ltd.'e aittir.
            Kullanıcılar platforma yükledikleri içerik ve verilerin haklarını saklı tutar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Sözleşmenin Feshi</h2>
          <p className="text-muted-foreground leading-relaxed">
            Kullanım koşullarının ihlali durumunda hesabınız önceden bildirmeksizin askıya alınabilir veya kapatılabilir.
            Hesap kapatma öncesinde verilerinizi dışa aktarma hakkına sahipsiniz.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">8. Uygulanacak Hukuk</h2>
          <p className="text-muted-foreground leading-relaxed">
            Bu sözleşme Türk Hukuku'na tabidir. Uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">9. İletişim</h2>
          <p className="text-muted-foreground leading-relaxed">
            Sorularınız için: <strong>legal@bysirius.com</strong> &nbsp;|&nbsp; <strong>bysirius.com</strong>
          </p>
        </section>

      </div>
    </div>
  );
}
