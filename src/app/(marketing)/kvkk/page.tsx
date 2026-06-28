import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "6698 Sayılı Kişisel Verilerin Korunması Kanunu kapsamında aydınlatma metni.",
};

export default function KVKKPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">KVKK Aydınlatma Metni</h1>
      <p className="text-sm text-muted-foreground mb-2">6698 Sayılı Kişisel Verilerin Korunması Kanunu</p>
      <p className="text-sm text-muted-foreground mb-10">Son güncelleme: Ocak 2026</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">

        <section>
          <h2 className="text-xl font-semibold mb-3">Veri Sorumlusu</h2>
          <p className="text-muted-foreground leading-relaxed">
            <strong>BY Sirius Group Ai & Technology Co Ltd.</strong> ("Şirket") olarak, 6698 sayılı Kişisel Verilerin
            Korunması Kanunu ("KVKK") uyarınca veri sorumlusu sıfatıyla kişisel verilerinizi aşağıda açıklanan
            amaçlar doğrultusunda ve mevzuata uygun biçimde işlemekteyiz.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            <strong>Web sitesi:</strong> bysirius.com &nbsp;|&nbsp; <strong>E-posta:</strong> kvkk@bysirius.com
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">İşlenen Kişisel Veriler</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-muted-foreground border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-semibold text-foreground">Veri Kategorisi</th>
                  <th className="text-left py-2 font-semibold text-foreground">Örnekler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="py-2 pr-4">Kimlik</td><td className="py-2">Ad, soyad</td></tr>
                <tr><td className="py-2 pr-4">İletişim</td><td className="py-2">E-posta, telefon</td></tr>
                <tr><td className="py-2 pr-4">İşletme</td><td className="py-2">İşletme adı, adres, sektör</td></tr>
                <tr><td className="py-2 pr-4">İşlem</td><td className="py-2">Randevu, fatura kayıtları</td></tr>
                <tr><td className="py-2 pr-4">Teknik</td><td className="py-2">IP adresi, tarayıcı bilgisi</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">İşleme Amaçları ve Hukuki Sebepler</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Sözleşmenin kurulması ve ifası (KVKK m. 5/2-c)</li>
            <li>Yasal yükümlülüklerin yerine getirilmesi (KVKK m. 5/2-ç)</li>
            <li>Meşru menfaatlerimizin korunması (KVKK m. 5/2-f)</li>
            <li>Açık rızanız dahilinde pazarlama iletişimi (KVKK m. 5/1)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Verilerin Aktarılması</h2>
          <p className="text-muted-foreground leading-relaxed">
            Kişisel verileriniz; ödeme altyapısı (Stripe), bildirim hizmetleri ve hosting sağlayıcıları ile
            KVKK'nın 8. ve 9. maddeleri kapsamında, veri işleme sözleşmeleri çerçevesinde aktarılabilir.
            Yurt dışı aktarım, yeterli koruma sağlandığı hallerde gerçekleştirilir.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">KVKK Madde 11 Kapsamındaki Haklarınız</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>İşlenmişse buna ilişkin bilgi talep etme</li>
            <li>Verilerin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
            <li>Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme</li>
            <li>Eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme</li>
            <li>Silinmesini veya yok edilmesini isteme</li>
            <li>İşlemenin otomatik sistemler vasıtasıyla gerçekleşmesi durumunda aleyhte sonuçlara itiraz etme</li>
            <li>Zararın giderilmesini talep etme</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Başvuru Yöntemi</h2>
          <p className="text-muted-foreground leading-relaxed">
            KVKK kapsamındaki haklarınızı kullanmak için aşağıdaki kanallar üzerinden başvurabilirsiniz:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground mt-2">
            <li><strong>E-posta:</strong> kvkk@bysirius.com</li>
            <li><strong>Web:</strong> bysirius.com/iletisim</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Başvurularınız kimlik doğrulama yapıldıktan sonra en geç 30 gün içinde sonuçlandırılır.
          </p>
        </section>

      </div>
    </div>
  );
}
