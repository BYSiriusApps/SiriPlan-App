import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "Siriplan gizlilik politikası — kişisel verilerinizi nasıl işlediğimizi öğrenin.",
};

export default function GizlilikPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Gizlilik Politikası</h1>
      <p className="text-sm text-muted-foreground mb-10">Son güncelleme: Ocak 2026</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">

        <section>
          <h2 className="text-xl font-semibold mb-3">1. Veri Sorumlusu</h2>
          <p className="text-muted-foreground leading-relaxed">
            Bu gizlilik politikası, <strong>BY Sirius Group Ai & Technology Co Ltd.</strong> ("Şirket", "biz", "bize") tarafından işletilen <strong>Siriplan</strong> platformu için geçerlidir.
            Şirket, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu sıfatını taşımaktadır.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-2">
            <strong>Web sitesi:</strong> bysirius.com &nbsp;|&nbsp; <strong>E-posta:</strong> privacy@bysirius.com
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">2. Toplanan Kişisel Veriler</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">Platform kullanımı sırasında aşağıdaki veriler işlenebilir:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Ad, soyad, e-posta adresi ve telefon numarası</li>
            <li>İşletme adı, adresi ve sektör bilgisi</li>
            <li>Randevu geçmişi ve müşteri kayıtları</li>
            <li>Ödeme ve fatura bilgileri (kart detayları saklanmaz; Stripe tarafından işlenir)</li>
            <li>IP adresi, tarayıcı türü ve kullanım istatistikleri</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">3. Verilerin İşlenme Amaçları</h2>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Platform hizmetlerinin sunulması ve yönetimi</li>
            <li>Abonelik ve ödeme işlemlerinin gerçekleştirilmesi</li>
            <li>Müşteri desteği ve teknik yardım sağlanması</li>
            <li>Güvenlik, dolandırıcılık önleme ve yasal yükümlülüklerin yerine getirilmesi</li>
            <li>Ürün geliştirme ve hizmet kalitesinin artırılması</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">4. Veri Güvenliği</h2>
          <p className="text-muted-foreground leading-relaxed">
            Verileriniz SSL/TLS şifrelemesi ile korunur. Sunucu altyapımız endüstri standardı güvenlik protokollerine uymaktadır.
            Ödeme bilgileriniz hiçbir zaman sunucularımızda saklanmaz; tüm ödeme işlemleri PCI-DSS uyumlu Stripe altyapısı üzerinden gerçekleşir.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">5. Üçüncü Taraf Paylaşımı</h2>
          <p className="text-muted-foreground leading-relaxed">
            Kişisel verileriniz, hizmet sunumu için zorunlu olmadıkça üçüncü taraflarla paylaşılmaz.
            Yalnızca; ödeme (Stripe), bildirim (WhatsApp/SMS) ve altyapı hizmetleri sağlayıcıları ile veri işleme sözleşmesi çerçevesinde paylaşım yapılabilir.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">6. Haklarınız</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">KVKK Madde 11 kapsamında aşağıdaki haklara sahipsiniz:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
            <li>Verilerinize erişim ve kopyasını talep etme</li>
            <li>Yanlış veya eksik verilerin düzeltilmesini isteme</li>
            <li>Verilerin silinmesini veya yok edilmesini talep etme</li>
            <li>Veri işlemeye itiraz etme</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-3">
            Talepleriniz için: <strong>privacy@bysirius.com</strong>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">7. Politika Değişiklikleri</h2>
          <p className="text-muted-foreground leading-relaxed">
            Bu politikada yapılan değişiklikler platform üzerinden duyurulur. Değişikliklerin yürürlüğe girmesinden sonra platformu kullanmaya devam etmeniz, güncellenmiş politikayı kabul ettiğiniz anlamına gelir.
          </p>
        </section>

      </div>
    </div>
  );
}
