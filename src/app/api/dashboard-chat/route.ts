import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Panel içi yardım asistanının bilgi tabanı — docs/kullanim-kilavuzu.md ile senkron tutulmalı. */
const SYSTEM_PROMPT = `Sen Siriplan panelinin içinde çalışan bir kullanım/destek asistanısın. Görevin, panele giriş yapmış salon/işletme sahiplerine ve personeline panelin nasıl kullanılacağını anlatmak ve sorularını yanıtlamaktır. Satış veya pazarlama yapmıyorsun — kullanıcı zaten müşteri.

Panel bölümleri ve ne işe yaradıkları:
- Ana Sayfa: Sürükle-bırakla kişiselleştirilebilir widget'lar (Aktif Randevular, Günlük Takvim, WhatsApp Asistanı, Kampanya Yıldızı, Yeni Müşteri, Rapor Özeti, Gelir-Gider, Hızlı İşlemler, Ciro Özeti, Bugünkü Personel, Hizmet Özeti). "Kişiselleştir" butonuyla widget'lar sıralanır/gizlenir.
- Takvim: Gün/hafta bazlı, personel renklerine göre kodlanmış görsel takvim. Randevular 15 dakikalık dilimler halinde planlanır.
- Randevular: Liste + Yeni Randevu ekranı. Randevu oluşturma/düzenleme/iptalde müşteriye otomatik bildirim (WhatsApp/E-posta/Telegram, ayarlara göre) gider. 5 durum vardır: Bekliyor (talep edildi, onaylanmadı), Onaylandı, Tamamlandı, İptal, Gelmedi (no-show).
- Müşteriler: Müşteri listesi, detay sayfasında geçmiş randevular ve notlar. Yeni Müşteri ekranından manuel eklenir; randevu oluşturunca da otomatik açılır.
- Hizmetler: Hizmet kataloğu — kategori, süre, fiyat. Süre takvimdeki slot uzunluğunu belirler.
- Personel: Personel daveti (e-posta/telefon), rol bazlı varsayılan yetkiler + kişiye özel istisnalar, çalışma günleri, takvim rengi, bildirim dili.
- Kampanyalar: Toplu WhatsApp mesajı ({{musteri_adi}}, {{salon_adi}} gibi şablon değişkenleriyle). Durumlar: Taslak → Planlandı → Gönderiliyor → Gönderildi / Başarısız.
- Raporlar: Günlük randevu sayısı, tamamlanan, ciro, gider, yeni müşteri; personel ve hizmet bazlı kırılımlar.
- Gelir-Gider: Randevu gelirlerinin yanında manuel gelir/gider (kira, malzeme, fatura) takibi, kasa durumu.
- Ayarlar → Bildirimler: WhatsApp (oluşturma/revize/iptal bildirimleri ayrı ayrı açılır kapanır, ton: Sıcak/Kısa/Resmi/Hizmet Detaylı), SMS (Netgsm/VatanSMS/İletimerkezi), E-posta, Telegram.
- Ayarlar → Yetkilendirme: Rol ve personel bazlı izin yönetimi.
- Veri Göçü: Excel/CSV içe aktarma; CSV/JSON/PDF dışa aktarma.
- Abonelik: Kayıt sonrası 14 gün ücretsiz deneme; süre dolmadan Ayarlar → Abonelik'ten plan seçilip ödeme yapılır.

Kurallar:
- Sadece panelin kullanımı hakkında konuş; kısa, adım adım ve net cevaplar ver (2-5 cümle veya kısa madde listesi).
- Kullanıcının o an hangi sayfada olduğunu bilmiyorsan, cevabında ilgili sayfanın adını söyle (örn. "Ayarlar → Bildirimler").
- Kendi hesabına özel veri (randevu/müşteri/ciro rakamları) isteyen olursa, bu bilgilere erişimin olmadığını belirt ve ilgili sayfaya yönlendir.
- Teknik bir arıza/hata bildirilirse destek@siriplan.com veya WhatsApp destek hattını öner.
- Kullanıcının yazdığı dilde cevap ver (TR/EN/RU/AR).`;

function getStaticResponse(message: string): string {
  const msg = message.toLowerCase();

  if (msg.includes("randevu") && (msg.includes("durum") || msg.includes("bekliyor") || msg.includes("onay") || msg.includes("gelmedi"))) {
    return "Randevuların 5 durumu vardır: Bekliyor (henüz onaylanmadı), Onaylandı, Tamamlandı, İptal, Gelmedi (müşteri gelmedi). Durumu randevu detay sayfasından güncelleyebilirsiniz.";
  }
  if (msg.includes("randevu")) {
    return "Randevular sayfasından yeni randevu oluşturabilir, Takvim sayfasından 15 dakikalık dilimlerle görsel olarak planlayabilirsiniz. Oluşturma/düzenleme/iptalde müşteriye otomatik bildirim gider (Ayarlar → Bildirimler'e bağlı).";
  }
  if (msg.includes("whatsapp") || msg.includes("bildirim") || msg.includes("sms") || msg.includes("telegram") || msg.includes("mail") || msg.includes("e-posta")) {
    return "Ayarlar → Bildirimler'den WhatsApp (oluşturma/revize/iptal ayrı ayrı), SMS (Netgsm/VatanSMS/İletimerkezi), E-posta ve Telegram kanallarını açıp kapatabilir, mesaj tonunu (Sıcak/Kısa/Resmi/Hizmet Detaylı) seçebilirsiniz.";
  }
  if (msg.includes("personel") || msg.includes("davet") || msg.includes("yetki") || msg.includes("izin")) {
    return "Personel sayfasından yeni personel davet edebilir; rol bazlı varsayılan yetkiler + kişiye özel istisnalarla erişimi sınırlandırabilirsiniz. Çalışma günleri, takvim rengi ve bildirim dili de personel detayından ayarlanır.";
  }
  if (msg.includes("müşteri")) {
    return "Müşteriler sayfasında tüm müşterileriniz ve geçmiş randevu sayıları listelenir. Yeni Müşteri ekranından manuel ekleyebilir, detay sayfasından geçmiş randevu ve notları görebilirsiniz.";
  }
  if (msg.includes("hizmet")) {
    return "Hizmetler sayfasından kategori, süre ve fiyat tanımlayarak hizmet kataloğunuzu oluşturursunuz. Süre, takvimdeki randevu slotunun uzunluğunu belirler.";
  }
  if (msg.includes("kampanya")) {
    return "Kampanyalar sayfasından toplu WhatsApp mesajı gönderebilirsiniz. Kampanyalar Taslak → Planlandı → Gönderiliyor → Gönderildi sırasıyla ilerler; hata olursa Başarısız olarak işaretlenir.";
  }
  if (msg.includes("rapor") || msg.includes("ciro")) {
    return "Raporlar sayfasında günlük randevu sayısı, ciro, gider ve yeni müşteri sayısını; ayrıca personel ve hizmet bazlı kırılımları görürsünüz.";
  }
  if (msg.includes("gider") || msg.includes("gelir") || msg.includes("kasa")) {
    return "Gelir-Gider sayfasından randevu gelirlerinin yanı sıra kira, malzeme, fatura gibi manuel kalemleri işleyerek kasa durumunuzu takip edebilirsiniz.";
  }
  if (msg.includes("excel") || msg.includes("csv") || msg.includes("içe aktar") || msg.includes("dışa aktar") || msg.includes("veri göçü") || msg.includes("import") || msg.includes("export")) {
    return "Veri Göçü sayfasından mevcut Excel/CSV verilerinizi içe aktarabilir; verilerinizi CSV, JSON veya PDF olarak dışa aktarabilirsiniz.";
  }
  if (msg.includes("deneme") || msg.includes("abonelik") || msg.includes("plan") || msg.includes("ödeme")) {
    return "Kayıt sonrası 14 günlük ücretsiz deneme başlar. Süre dolmadan Ayarlar → Abonelik üzerinden bir plan seçip ödeme yaparak kesintisiz kullanmaya devam edebilirsiniz.";
  }
  if (msg.includes("dil") || msg.includes("language")) {
    return "Panel TR/EN/RU/AR dillerini destekler. Bildirimlerin hangi dilde gideceğini her personel için Personel sayfasından ayrıca ayarlayabilirsiniz.";
  }
  if (msg.includes("widget") || msg.includes("ana sayfa") || msg.includes("kişiselleştir")) {
    return "Ana Sayfa'daki \"Kişiselleştir\" butonuyla widget'ları sürükle-bırakla sıralayabilir, istemediklerinizi gizleyebilirsiniz. Tercihler size özel kaydedilir.";
  }
  if (msg.includes("destek") || msg.includes("yardım") || msg.includes("hata") || msg.includes("sorun")) {
    return "Panel kullanımıyla ilgili sorularınızı buradan sorabilirsiniz. Teknik bir arıza için destek@siriplan.com veya WhatsApp destek hattımıza ulaşabilirsiniz.";
  }

  return "Merhaba! Panel kullanımıyla ilgili sorularınızı yanıtlayabilirim — randevular, müşteriler, personel, bildirimler, raporlar veya ayarlar hakkında ne öğrenmek istersiniz?";
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Mesaj gerekli" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const isPlaceholder = !apiKey || apiKey.includes("placeholder") || apiKey === "your-gemini-api-key-here";

    if (isPlaceholder) {
      const response = getStaticResponse(message);
      return NextResponse.json({ response });
    }

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
          generationConfig: { maxOutputTokens: 300 },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const fallback = getStaticResponse(message);
      return NextResponse.json({ response: fallback });
    }

    const data = await geminiResponse.json();
    const response = data.candidates?.[0]?.content?.parts?.[0]?.text ?? getStaticResponse(message);

    return NextResponse.json({ response });
  } catch {
    return NextResponse.json({
      response: "Şu an yanıt veremiyorum. Lütfen destek@siriplan.com veya WhatsApp üzerinden ulaşın.",
    });
  }
}
