"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { HomeButton } from "@/components/dashboard/HomeButton";
import { useTranslations } from "next-intl";
import {
  HelpCircle,
  PlayCircle,
  BookOpen,
  User,
  Settings,
  Scissors,
  Users,
  Calendar,
  Wallet,
  Globe,
  MessageSquare,
  Send,
  Megaphone,
  CreditCard,
  Heart,
  BarChart3,
  AlertTriangle,
  Lock,
  ChevronRight,
  Maximize2
} from "lucide-react";

export default function RehberPage() {
  const t = useTranslations("dashboard");
  const [activeTab, setActiveTab] = useState<string>("baslangic");
  const [isFullscreenSunum, setIsFullscreenSunum] = useState<boolean>(false);

  // Kopyalama ve Sağ Tık Engelleme Koruması
  useEffect(() => {
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error("SiriPlan kılavuz içerikleri telif hakkı ile korunmaktadır ve kopyalanamaz.", {
        icon: "🔒"
      });
    };

    const preventRightClick = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Belirli tuş kombinasyonlarını engelleme (F12, Ctrl+Shift+I, Ctrl+C)
    const preventInspect = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && e.key === "I") ||
        (e.ctrlKey && e.shiftKey && e.key === "J") ||
        (e.ctrlKey && e.key === "u") ||
        (e.ctrlKey && e.key === "c")
      ) {
        e.preventDefault();
        toast.error("Bu sayfada geliştirici araçları ve kopyalama kısıtlanmıştır.", {
          icon: "🔒"
        });
      }
    };

    document.addEventListener("copy", preventCopy);
    document.addEventListener("contextmenu", preventRightClick);
    document.addEventListener("keydown", preventInspect);

    return () => {
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("contextmenu", preventRightClick);
      document.removeEventListener("keydown", preventInspect);
    };
  }, []);

  const isTr = t("guide").includes("Kılavuzu");
  const isEn = t("guide").includes("User Guide");
  const isRu = t("guide").includes("Руководство");

  const getMenuLabel = (id: string, def: string) => {
    if (id === "baslangic") return isTr ? "1. Hızlı Başlangıç" : isEn ? "1. Quick Start" : isRu ? "1. Быстрый старт" : "1. البدء السريع";
    if (id === "giris") return isTr ? "2. Giriş Akışı & Rolleri" : isEn ? "2. Login Flow & Roles" : isRu ? "2. Процесс входа и роли" : "2. تدفق الدخول والأدوار";
    if (id === "panel") return isTr ? "3. Panel Kişiselleştirme" : isEn ? "3. Dashboard Personalization" : isRu ? "3. Персонализация панели" : "3. تخصيص اللوحة";
    if (id === "hizmetler") return isTr ? "4. Hizmet Tanımlama" : isEn ? "4. Service Catalog Setup" : isRu ? "4. Настройка каталога услуг" : "4. تحديد الخدمات";
    if (id === "personel") return isTr ? "5. Personel & Yetkiler" : isEn ? "5. Staff & Permissions" : isRu ? "5. Персонал и права" : "5. الموظفون والصلاحيات";
    if (id === "takvim") return isTr ? "6. Takvim & Randevu" : isEn ? "6. Calendar & Appointment" : isRu ? "6. Календарь и записи" : "6. التقويم والمواعيد";
    if (id === "adisyon") return isTr ? "7. Adisyon & Fiş Yazma" : isEn ? "7. Adisyon & Receipt Print" : isRu ? "7. Чеки и печать" : "7. الفواتير وطباعة الإيصال";
    if (id === "vitrin") return isTr ? "8. Web Vitrini (/r/[slug])" : isEn ? "8. Web Showcase (/r/[slug])" : isRu ? "8. Веб-витрина (/r/[slug])" : "8. واجهة الويب (/r/[slug])";
    if (id === "whatsapp") return isTr ? "9. Bildirim Ayarları" : isEn ? "9. Notification Settings" : isRu ? "9. Настройки уведомлений" : "9. إعدادات الإشعارات";
    if (id === "telegram") return isTr ? "10. Telegram Botu" : isEn ? "10. Telegram Bot" : isRu ? "10. Telegram-бот" : "10. بوت تليجرام";
    if (id === "kampanya") return isTr ? "11. Toplu Kampanyalar" : isEn ? "11. Bulk Campaigns" : isRu ? "11. Массовые рассылки" : "11. الحملات الجماعية";
    if (id === "abonelik") return isTr ? "12. Abonelik & Plan" : isEn ? "12. Subscription & Plan" : isRu ? "12. Подписка и тариф" : "12. الاشتراك والخطة";
    if (id === "sadakat") return isTr ? "13. Sadakat Puanları" : isEn ? "13. Loyalty Points" : isRu ? "13. Баллы лояльности" : "13. نقاط الولاء";
    if (id === "maas") return isTr ? "14. Gelir-Gider & Maaş" : isEn ? "14. Income-Expense & Salary" : isRu ? "14. Расходы и зарплата" : "14. المصروفات والرواتب";
    if (id === "raporlar") return isTr ? "15. Raporlar & Veri Göçü" : isEn ? "15. Reports & Data Migration" : isRu ? "15. Отчеты и импорт" : "15. التقارير ونقل البيانات";
    if (id === "sss") return isTr ? "16. Sık Sorulan Sorular" : isEn ? "16. Frequently Asked Questions" : isRu ? "16. Вопросы и ответы (FAQ)" : "16. الأسئلة الشائعة";
    if (id === "sunum") return isTr ? "🎬 İnteraktif Sunum (19 Slayt)" : isEn ? "🎬 Interactive Presentation (19 Slides)" : isRu ? "🎬 Презентация (19 слайдов)" : "🎬 عرض تقديمي تفاعلي (19 شريحة)";
    return def;
  };

  const menuItems = [
    { id: "baslangic", icon: PlayCircle },
    { id: "giris", icon: User },
    { id: "panel", icon: Settings },
    { id: "hizmetler", icon: Scissors },
    { id: "personel", icon: Users },
    { id: "takvim", icon: Calendar },
    { id: "adisyon", icon: Wallet },
    { id: "vitrin", icon: Globe },
    { id: "whatsapp", icon: MessageSquare },
    { id: "telegram", icon: Send },
    { id: "kampanya", icon: Megaphone },
    { id: "abonelik", icon: CreditCard },
    { id: "sadakat", icon: Heart },
    { id: "maas", icon: Wallet },
    { id: "raporlar", icon: BarChart3 },
    { id: "sss", icon: HelpCircle },
    { id: "sunum", icon: BookOpen, highlight: true }
  ].map(item => ({ ...item, label: getMenuLabel(item.id, "") }));

  return (
    <div className="p-6 space-y-6 select-none">
      {/* Üst Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10 text-primary shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70">
              {isTr ? "DESTEK & EĞİTİM" : isEn ? "SUPPORT & EDUCATION" : isRu ? "ПОДДЕРЖКА И ОБУЧЕНИЕ" : "الدعم والتعليم"}
            </span>
            <h1 className="text-2xl md:text-3xl font-bold brand-gradient-text leading-tight">{t("guide")}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-3 py-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            {isTr ? "Kopyalamaya Karşı Korumalı" : isEn ? "Copy Protected" : isRu ? "Защищено от копирования" : "محمي ضد النسخ"}
          </Badge>
          <HomeButton />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sol Menü */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : item.highlight
                    ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isActive ? "rotate-90" : ""}`} />
              </button>
            );
          })}
        </div>

        {/* Sağ İçerik Paneli */}
        <div className="lg:col-span-8 xl:col-span-9">
          <Card className="border-border shadow-md">
            <CardContent className="pt-6 space-y-6">
              {/* 1. HIZLI BAŞLANGIÇ */}
              {activeTab === "baslangic" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">1. Hızlı Başlangıç & Hesap Kurulumu</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    SiriPlan Randevu & İşletme Yönetim Sistemi ile salonunuzu 5 dakikada dijitalleştirin. Kağıt-kalem karmaşasına, unutulan randevulara ve boş koltuklara son verin!
                  </p>
                  <div className="space-y-3 mt-4">
                    <div className="flex gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0 mt-0.5">1</div>
                      <div>
                        <h4 className="font-semibold">Ücretsiz Kayıt Olun</h4>
                        <p className="text-sm text-muted-foreground">Kayıt ekranından işletme adınız, e-postanız ve telefon numaranızla 14 gün ücretsiz hesabınızı açın. Kredi kartı gerekmez.</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0 mt-0.5">2</div>
                      <div>
                        <h4 className="font-semibold">İşletme Bilgilerini Doldurun</h4>
                        <p className="text-sm text-muted-foreground"><b>Ayarlar → Genel</b> sekmesine gidin. Sektörünüzü seçin (Kuaför, Güzellik Salonu, Nail Art, Spa vb.), çalışma gün ve saatlerinizi belirleyin, logonuzu ve kapak görselinizi yükleyin.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. GİRİŞ AKIŞI */}
              {activeTab === "giris" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">2. Giriş Akışı: Yönetici ve Personel Girişi</h2>
                  <p className="text-muted-foreground leading-relaxed">SiriPlan çoklu kullanıcı ve rol mimarisini destekler:</p>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    <li>
                      <strong className="text-foreground">İşletme Sahibi / Yönetici Girişi:</strong> Kayıtlı E-posta veya Telefon numarası + şifre ile sisteme giriş yapar. İşletmenin tüm finansal verilerine, ayarlarına ve raporlarına tam erişime sahiptir.
                    </li>
                    <li>
                      <strong className="text-foreground">Personel Girişi:</strong> Yönetici, <b>Personel → Davet Et</b> butonu ile personeline bir davet bağlantisi gönderir. Personel kendi e-postası veya telefonu ile sisteme girerek bağlı olduğu işletmenin paneline yönlendirilir. Personeller yalnızca kendi randevularını ve müşteri takvimini görür; işletme cirosu ve finansal ayarları göremezler.
                    </li>
                  </ul>
                </div>
              )}

              {/* 3. PANEL KİŞİSELLEŞTİRME */}
              {activeTab === "panel" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">3. Panel Açılışını (Dashboard) Kişiselleştirme</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Panele giriş yaptığınızda karşınıza çıkan Ana Sayfa (Dashboard) widget tabanlı esnek bir yapıya sahiptir:
                  </p>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    <li><b>Widget'ları Sürükle-Bırak:</b> Sağ üstteki <b>"Kişiselleştir"</b> butonuna basarak widget kartlarının yerlerini sürükleyip değiştirebilirsiniz.</li>
                    <li><b>Kartları Göster / Gizle:</b> İhtiyacınız olmayan kartları göz ikonuna basarak gizleyebilir, sık kullandıklarınızı ön plana çıkarabilirsiniz.</li>
                    <li><b>Kişiye Özel Hafıza:</b> Yapılan görünüm tercihleri her kullanıcının kendi hesabına özel kaydedilir (bir uzmanın gizlediği kart yöneticinin ekranını etkilemez).</li>
                  </ul>
                </div>
              )}

              {/* 4. HİZMET TANIMLAMA */}
              {activeTab === "hizmetler" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">4. Hizmetlerinizi Tanımlayın</h2>
                  <p className="text-muted-foreground leading-relaxed">İşletmenizde sunduğunuz tüm işlemleri sisteme yükleyin:</p>
                  <ol className="space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
                    <li>Sol menüden <b>Hizmetler</b> sekmesine girin.</li>
                    <li><b>+ Yeni Hizmet</b> butonuna tıklayın.</li>
                    <li>Bilgileri doldurun: Hizmet adı, kategorisi, süresi (takvimde işlem süresini kilitler) ve fiyatı girin.</li>
                    <li><b>Kaydet</b> butonuna basın.</li>
                  </ol>
                </div>
              )}

              {/* 5. PERSONEL & YETKİLER */}
              {activeTab === "personel" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">5. Personellerinizi ve Yetkileri Ekleyin</h2>
                  <p className="text-muted-foreground leading-relaxed">Ekibinizdeki her uzman için ayrı takvim ve yetki tanımlayabilirsiniz:</p>
                  <ol className="space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
                    <li>Sol menüden <b>Personel</b> sekmesine girin.</li>
                    <li><b>+ Personel Ekle / Davet Et</b> butonuna tıklayın.</li>
                    <li>Personelin adını, telefonunu, çalışma günlerini ve takvimde görünecek rengini seçin.</li>
                    <li><b>Yetki Rolü Belirleyin:</b> <i>Yönetici</i> (Tüm yetkiler) veya <i>Personel</i> (Yalnızca kendi randevularını görebilme) rollerini atayın.</li>
                    <li><b>Maaş & Komisyon Tanımı:</b> Personel detay sayfasından Taban Maaş ve % Komisyon Oranı belirleyin.</li>
                  </ol>
                </div>
              )}

              {/* 6. TAKVİM & RANDEVU */}
              {activeTab === "takvim" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">6. Takvim & Randevu Yönetimi</h2>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <h4 className="font-semibold text-foreground">Tıklayarak Anında Randevu Oluşturma:</h4>
                    <p>Takvim ekranında boş bir saat dilimine veya bir uzmanın sütununa tıkladığınızda, seçtiğiniz Tarih, Saat ve Personel otomatik doldurulmuş olarak Yeni Randevu modalı açılır.</p>
                    <h4 className="font-semibold text-foreground mt-4">Takvimi Özelleştirme ve Filtreleme:</h4>
                    <p>Takviminizi Gün, Hafta veya Ay bazında görüntüleyebilirsiniz. Personel filtresini kullanarak tüm uzmanları yan yana sütunlar halinde kıyaslayabilir veya tek bir personelin programına odaklanabilirsiniz.</p>
                  </div>
                </div>
              )}

              {/* 7. ADİSYON & FİŞ YAZMA */}
              {activeTab === "adisyon" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">7. Adisyon Oluşturma & Fiş Çıkarma</h2>
                  <p className="text-muted-foreground leading-relaxed">SiriPlan panelinde tamamlanan randevular için profesyonel adisyon ve fiş dökümü mevcuttur:</p>
                  <ol className="space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
                    <li>Randevunun üzerine tıklayıp detay sayfasında bulunan <b>"Adisyon"</b> butonuna tıklayın.</li>
                    <li>Adisyon içeriğinde: İşletme Logosu, İşletme Adı, Adres, Telefon, Hizmet(ler), Bahşiş ve Toplam Tutar ile Ödeme Yöntemi görünür.</li>
                    <li>Sağ üstteki <b>"Yazdır"</b> butonu ile adisyonu doğrudan termal yazıcıya gönderebilir veya PDF olarak kaydedebilirsiniz.</li>
                  </ol>
                </div>
              )}

              {/* 8. WEB VİTRİNİ */}
              {activeTab === "vitrin" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">8. İşletme Web Sitesi & Vitrin Görünümü (/r/[slug])</h2>
                  <p className="text-muted-foreground leading-relaxed">Müşterilerinizin 7/24 online randevu alabileceği ve salonunuzu inceleyebileceği özel bir web vitrini sunulur:</p>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    <li><b>Özel Web Adresi:</b> Her işletmeye özel `siriplan.com/r/isletme-adiniz` şeklinde şık bir bağlantı tanımlanır.</li>
                    <li><b>Resim & Görsel Yükleme:</b> <b>Ayarlar → Genel</b> sayfasından salonunuzun Logosunu, Kapak Görselini ve Salon Galeri Fotoğraflarını yükleyebilirsiniz. Fotoğraflar vitrin sayfasında estetik şekilde listelenir.</li>
                    <li><b>Online Randevu Sihirbazı:</b> Müşterileriniz profilinize girerek sırasıyla <i>Hizmet → Personel → Tarih ve Saat</i> seçip saniyeler içinde randevu oluşturabilirler.</li>
                  </ul>
                </div>
              )}

              {/* 9. BİLDİRİM AYARLARI */}
              {activeTab === "whatsapp" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">9. Otomatik WhatsApp / SMS Bildirimleri</h2>
                  <p className="text-muted-foreground leading-relaxed">Müşterilerinizin randevuyu unutmasını engellemenin en pratik yolu!</p>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    <li><b>Ayarlar → Bildirimler</b> bölümüne gidip WhatsApp, SMS veya Telegram entegrasyonunu aktif edin.</li>
                    <li><b>Otomatik Mesaj Türleri:</b> Randevu Oluşturuldu, Hatırlatma (randevudan 2 saat veya 1 gün önce) ve İptal/Değişiklik bildirimleri otomatik olarak gider.</li>
                    <li><b>Mesaj Tonu:</b> Sıcak, Resmi veya Kısa stillerden salon konseptinize uygun olanı seçin.</li>
                  </ul>
                </div>
              )}

              {/* 10. TELEGRAM BOTU */}
              {activeTab === "telegram" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">10. Telegram Bildirim Botu (@siriplan_bot Kurulumu)</h2>
                  <p className="text-muted-foreground leading-relaxed">Yeni randevu taleplerinde telefonunuza anında ücretsiz bildirim almak için:</p>
                  <ol className="space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
                    <li>Telegram uygulamasında arama kısmına <b>@siriplan_bot</b> yazın, botu açıp <b>"Başlat / Start"</b> butonuna basın.</li>
                    <li>Botun size verdiği sayısal <b>Chat ID</b> numarasını kopyalayın.</li>
                    <li>SiriPlan panelinde <b>Ayarlar → Bildirimler</b> alanındaki <b>"Telegram Chat ID"</b> kutusuna yapıştırıp kaydedin.</li>
                  </ol>
                </div>
              )}

              {/* 11. TOPLU KAMPANYALAR */}
              {activeTab === "kampanya" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">11. Toplu WhatsApp Kampanyaları</h2>
                  <p className="text-muted-foreground leading-relaxed">Boş günleri doldurmak veya özel kampanyalar yapmak için müşterilerinize toplu mesaj gönderin:</p>
                  <ol className="space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
                    <li><b>Kampanyalar</b> sekmesine tıklayın ve <b>+ Yeni Kampanya</b> butonuna basın.</li>
                    <li>Mesaj metnini yazın ve dinamik değişkenleri kullanın: <code>{"Merhaba {{musteri_adi}}, {{salon_adi}}..."}</code></li>
                    <li>İstediğiniz müşteri grubunu filtreleyin (Örn: Son 30 gündür gelmeyenler) ve gönderimi başlatın.</li>
                  </ol>
                </div>
              )}

              {/* 12. ÖDEME & ABONELİK */}
              {activeTab === "abonelik" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">12. Abonelik & Plan Yönetimi</h2>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p><b>Planlar:</b> Starter, Pro ve Business planlarının tamamı sabit ve şeffaf yapıdadır; teklif alma / temsilci bekleme adımı yoktur. Her yeni hesap 14 gün ücretsiz deneme ile başlar.</p>
                    <p><b>Plan bilgileriniz:</b> Mevcut planınızı, kullanım limitlerinizi ve fatura geçmişinizi <b>Ayarlar → Abonelik</b> sayfasından görüntüleyebilirsiniz.</p>
                    <p><b>Aboneliğiniz</b> SiriPlan hesabınıza bağlıdır ve uygulama mağazalarından bağımsız olarak yönetilir. Plan yükseltme, yenileme veya faturalandırmayla ilgili sorularınız için destek ekibimizle iletişime geçin: <b>info@bysirius.com</b> · WhatsApp <b>+90 535 503 26 34</b>.</p>
                  </div>
                </div>
              )}

              {/* 13. SADAKAT PUANLARI */}
              {activeTab === "sadakat" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">13. Müşteri Yönetimi & Sadakat Puanları</h2>
                  <p className="text-muted-foreground leading-relaxed">Müşterilerinizin bağlılığını artırmak için sadakat puanı altyapısını kullanın:</p>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    <li><b>Müşteri Geçmişi:</b> Müşteri detay sayfasından geçmiş tüm işlemlerini ve özel notlarını inceleyin.</li>
                    <li><b>Sadakat Puanı:</b> Her tamamlanan randevuda müşterilerinize otomatik puan kazandırabilirsiniz. Hangi hizmetlerin sadakat kartı kazandıracağını Hizmetler sekmesinden ayarlayabilirsiniz.</li>
                  </ul>
                </div>
              )}

              {/* 14. GELİR-GİDER & MAAŞ */}
              {activeTab === "maas" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">14. Gelir-Gider Takibi & Personel Maaş Hesaplama</h2>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    <li><b>Kasa Yönetimi:</b> Kira, malzeme alımı, çay-faturalar gibi tüm harcamaları Gelir-Gider sekmesinden kaydederek net kârınızı izleyin.</li>
                    <li><b>Personel Maaş & Komisyon:</b> <b>Personel → Maaş Hesapla</b> sayfasından o ayki toplam ödemeyi tek tıkla hesaplayın: <code>Taban Maaş + (Yapılan Ciro × Komisyon %) + Bahşişler</code>. Ödeme tamamlandığında tek tıkla gider olarak kasaya işleyin.</li>
                  </ul>
                </div>
              )}

              {/* 15. RAPORLAR & VERİ GÖÇÜ */}
              {activeTab === "raporlar" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">15. Raporlar ve Veri Göçü (Excel)</h2>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    <li><b>Detaylı Raporlar:</b> Günlük/haftalık randevu sayıları, ciro grafikleri, en çok tercih edilen hizmetler ve personel performanslarını analiz edin.</li>
                    <li><b>Excel/CSV Aktarımı:</b> Eski müşteri listenizi Veri Göçü sayfasından Excel dosyasıyla tek tıkla yükleyin veya tüm verilerinizi yedeklemek için JSON/CSV olarak dışarı aktarın.</li>
                  </ul>
                </div>
              )}

              {/* 16. SIK SORULAN SORULAR */}
              {activeTab === "sss" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">16. Sık Sorulan Sorular (SSS)</h2>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold text-foreground">Telegram randevu bildirimlerini nasıl açabilirim?</h4>
                      <p className="text-muted-foreground mt-1">Telegram'da @siriplan_bot botuna mesaj atıp /start butonuna basın. Size verilen Chat ID numarasını Ayarlar sekmesindeki Telegram alanına yapıştırın.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Business planı için teklif mi istemeliyim?</h4>
                      <p className="text-muted-foreground mt-1">Hayır, Business dahil tüm planlar sabit ve şeffaf yapıdadır; teklif alma adımı yoktur.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Planımı nereden görebilirim?</h4>
                      <p className="text-muted-foreground mt-1">Ayarlar → Abonelik sayfasından mevcut planınızı, kullanım limitlerinizi ve fatura geçmişinizi görüntüleyebilirsiniz. Plan ve faturalandırma sorularınız için: info@bysirius.com</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 🎬 İNTERAKTİF SUNUM (19 SLAYT) */}
              {activeTab === "sunum" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">🎬 SiriPlan İnteraktif Sunum</h2>
                      <p className="text-sm text-muted-foreground">Kullanım kılavuzunu 19 slaytlık görsel slayt gösterisi olarak inceleyin.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFullscreenSunum(!isFullscreenSunum)}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <Maximize2 className="w-4 h-4" /> Tam Ekran Modu
                    </Button>
                  </div>

                  {isFullscreenSunum ? (
                    <div className="fixed inset-0 z-50 bg-black flex flex-col">
                      <div className="p-4 bg-background border-b border-border flex items-center justify-between">
                        <span className="font-semibold text-foreground">SiriPlan İnteraktif Sunum</span>
                        <Button variant="ghost" size="sm" onClick={() => setIsFullscreenSunum(false)} className="cursor-pointer">
                          Kapat (ESC)
                        </Button>
                      </div>
                      <iframe src="/api/docs/presentation" className="w-full flex-1 border-0" title="SiriPlan Sunum" />
                    </div>
                  ) : (
                    <div className="w-full h-[65vh] border border-border rounded-xl overflow-hidden bg-black shadow-lg relative">
                      <iframe src="/api/docs/presentation" className="w-full h-full border-0" title="SiriPlan Sunum" />
                    </div>
                  )}

                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg p-3 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                      <strong>Fikri Mülkiyet Koruması:</strong> Bu interaktif sunum dosyası oturum doğrulamalı güvenli API üzerinden çekilmektedir. Harici platformlarda paylaşılamaz veya kopyalanamaz.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
