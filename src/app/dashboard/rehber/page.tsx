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
                  <h2 className="text-xl font-bold text-foreground">
                    {isTr ? "1. Hızlı Başlangıç & Hesap Kurulumu" : isEn ? "1. Quick Start & Account Setup" : isRu ? "1. Быстрый старт и настройка" : "1. البدء السريع وإعداد الحساب"}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {isTr 
                      ? "SiriPlan Randevu & İşletme Yönetim Sistemi ile salonunuzu 5 dakikada dijitalleştirin. Kağıt-kalem karmaşasına, unutulan randevulara ve boş koltuklara son verin!"
                      : isEn 
                      ? "Digitalize your salon in 5 minutes with SiriPlan Appointment & Business Management System. Stop paper-pen chaos, forgotten appointments, and empty chairs!"
                      : isRu 
                      ? "Оцифруйте свой салон за 5 минут с помощью Системы управления SiriPlan. Забудьте о бумажном хаосе, забытых визитах и пустых креслах!"
                      : "قم برقمة صالونك في 5 دقائق مع نظام SiriPlan لإدارة المواعيد والأعمال. قل وداعاً لفوضى الورق والقلم، والمواعيد المنسية، والمقاعد الفارغة!"}
                  </p>
                  <div className="space-y-3 mt-4">
                    <div className="flex gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0 mt-0.5">1</div>
                      <div>
                        <h4 className="font-semibold">{isTr ? "Ücretsiz Kayıt Olun" : isEn ? "Register for Free" : isRu ? "Зарегистрируйтесь бесплатно" : "سجل مجاناً"}</h4>
                        <p className="text-sm text-muted-foreground">
                          {isTr 
                            ? "Kayıt ekranından işletme adınız, e-postanız ve telefon numaranızla 14 gün ücretsiz hesabınızı açın. Kredi kartı gerekmez."
                            : isEn 
                            ? "Open your 14-day free trial account with your business name, email, and phone number. No credit card required."
                            : isRu 
                            ? "Создайте бесплатный 14-дневный аккаунт, указав название компании, email и телефон. Кредитная карта не требуется."
                            : "افتح حسابك التجريبي المجاني لمدة 14 يومًا باسم عملك وبريدك الإلكتروني وهاتفك. لا يلزم وجود بطاقة ائتمان."}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0 mt-0.5">2</div>
                      <div>
                        <h4 className="font-semibold">{isTr ? "İşletme Bilgilerini Doldurun" : isEn ? "Fill Business Information" : isRu ? "Заполните информацию о бизнесе" : "ملء معلومات العمل"}</h4>
                        <p className="text-sm text-muted-foreground">
                          {isTr 
                            ? "Ayarlar → Genel sekmesine gidin. Sektörünüzü seçin (Kuaför, Güzellik Salonu, Nail Art, Spa vb.), çalışma gün ve saatlerinizi belirleyin, logonuzu ve kapak görselinizi yükleyin."
                            : isEn 
                            ? "Go to Settings → General. Select your sector (Hairdresser, Beauty Salon, Nail Art, Spa, etc.), set your working days/hours, and upload your logo and cover photo."
                            : isRu 
                            ? "Перейдите в Настройки → Общие. Выберите сферу (Парикмахерская, Салон красоты, Ногти, Спа и т. д.), укажите рабочие дни/часы, загрузите логотип и обложку."
                            : "انتقل إلى الإعدادات ← عام. اختر قطاعك (مصفف شعر، صالون تجميل، أظافر، سبا، إلخ)، وحدد أيام وساعات العمل، وقم بتحميل الشعار وصورة الغلاف."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. GİRİŞ AKIŞI */}
              {activeTab === "giris" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">
                    {isTr ? "2. Giriş Akışı: Yönetici ve Personel Girişi" : isEn ? "2. Login Flow: Admin and Staff Login" : isRu ? "2. Вход: Администратор и Персонал" : "2. تدفق تسجيل الدخول: دخول المدير والموظفين"}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {isTr ? "SiriPlan çoklu kullanıcı ve rol mimarisini destekler:" : isEn ? "SiriPlan supports multi-user and role architecture:" : isRu ? "SiriPlan поддерживает многопользовательскую архитектуру и роли:" : "يدعم SiriPlan البنية متعددة المستخدمين والأدوار:"}
                  </p>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    <li>
                      <strong className="text-foreground">
                        {isTr ? "İşletme Sahibi / Yönetici Girişi:" : isEn ? "Business Owner / Admin Login:" : isRu ? "Владелец / Администратор:" : "مالك العمل / دخول المدير:"}
                      </strong>{" "}
                      {isTr 
                        ? "Kayıtlı E-posta veya Telefon numarası + şifre ile sisteme giriş yapar. İşletmenin tüm finansal verilerine, ayarlarına ve raporlarına tam erişime sahiptir."
                        : isEn 
                        ? "Log in with registered Email or Phone + password. Full access to all financial data, settings, and reports."
                        : isRu 
                        ? "Вход по зарегистрированному Email или Телефону + пароль. Полный доступ к финансовым данным, настройкам и отчетам."
                        : "تسجيل الدخول باستخدام البريد الإلكتروني أو الهاتف المسجل + كلمة المرور. وصول كامل لجميع البيانات المالية والإعدادات والتقارير."}
                    </li>
                    <li>
                      <strong className="text-foreground">
                        {isTr ? "Personel Girişi:" : isEn ? "Staff Login:" : isRu ? "Вход персонала:" : "دخول الموظفين:"}
                      </strong>{" "}
                      {isTr 
                        ? "Yönetici, Personel → Davet Et butonu ile personeline bir davet bağlantisi gönderir. Personel kendi e-postası veya telefonu ile sisteme girerek bağlı olduğu işletmenin paneline yönlendirilir. Personeller yalnızca kendi randevularını ve müşteri takvimini görür; işletme cirosu ve finansal ayarları göremezler."
                        : isEn 
                        ? "Admin sends invitation link via Staff → Invite. Staff registers with their email/phone to access dashboard. Staff only see their own appointments and customer calendar, not business turnover or financials."
                        : isRu 
                        ? "Администратор отправляет ссылку-приглашение через Персонал → Пригласить. Сотрудник входит под своим email/телефоном. Видит только свои приемы и календарь, без доступа к оборотам."
                        : "يرسل المدير رابط دعوة عبر الموظفين ← دعوة. يدخل الموظف ببريده أو هاتفه. يرى الموظفون فقط مواعيدهم الخاصة وجدول عملائهم، ولا يمكنهم رؤية أرباح العمل أو الإعدادات المالية."}
                    </li>
                  </ul>
                </div>
              )}

              {/* 3. PANEL KİŞİSELLEŞTİRME */}
              {activeTab === "panel" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">
                    {isTr ? "3. Panel Açılışını (Dashboard) Kişiselleştirme" : isEn ? "3. Dashboard Personalization" : isRu ? "3. Персонализация панели" : "3. تخصيص الصفحة الرئيسية (لوحة التحكم)"}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {isTr ? "Panele giriş yaptığınızda karşınıza çıkan Ana Sayfa (Dashboard) widget tabanlı esnek bir yapıya sahiptir:" : isEn ? "The main dashboard screen has a widget-based flexible structure:" : isRu ? "Главная панель при входе имеет гибкую виджетную структуру:" : "تتميز لوحة التحكم الرئيسية عند تسجيل الدخول ببنية مرنة تعتمد على الأدوات (Widgets):"}
                  </p>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    <li>
                      <b>{isTr ? "Widget'ları Sürükle-Bırak:" : isEn ? "Drag & Drop Widgets:" : isRu ? "Перетаскивание виджетов:" : "سحب وإفلات الأدوات:"}</b>{" "}
                      {isTr ? "Sağ üstteki \"Kişiselleştir\" butonuna basarak widget kartlarının yerlerini sürükleyip değiştirebilirsiniz." : isEn ? "Click \"Personalize\" at the top right to drag and rearrange widget cards." : isRu ? "Нажмите «Персонализировать» вверху справа, чтобы перетащить карточки." : "اضغط على زر \"تخصيص\" في أعلى اليمين لتغيير مواقع بطاقات الأدوات بالسحب."}
                    </li>
                    <li>
                      <b>{isTr ? "Kartları Göster / Gizle:" : isEn ? "Show / Hide Cards:" : isRu ? "Показать / скрыть карточки:" : "إظهار / إخفاء البطاقات:"}</b>{" "}
                      {isTr ? "İhtiyacınız olmayan kartları göz ikonuna basarak gizleyebilir, sık kullandıklarınızı ön plana çıkarabilirsiniz." : isEn ? "Hide cards you don't need by clicking the eye icon, and pin your favorites." : isRu ? "Скройте ненужные карточки, нажав на иконку глаза, и закрепите часто используемые." : "يمكنك إخفاء البطاقات التي لا تحتاج إليها بالضغط على أيقونة العين، وإبراز البطاقات المفضلة لديك."}
                    </li>
                    <li>
                      <b>{isTr ? "Kişiye Özel Hafıza:" : isEn ? "User-Specific Memory:" : isRu ? "Индивидуальные настройки:" : "ذاكرة خاصة بكل مستخدم:"}</b>{" "}
                      {isTr ? "Yapılan görünüm tercihleri her kullanıcının kendi hesabına özel kaydedilir (bir uzmanın gizlediği kart yöneticinin ekranını etkilemez)." : isEn ? "View preferences are saved for each user individually (hiding a card for staff doesn't affect admin)." : isRu ? "Настройки сохраняются отдельно для каждого пользователя (скрытый сотрудником виджет не влияет на экран владельца)." : "يتم حفظ تفضيلات المظهر بشكل خاص لحساب كل مستخدم (إخفاء بطاقة بواسطة موظف لا يؤثر على شاشة المدير)."}
                    </li>
                  </ul>
                </div>
              )}

              {/* 4. HİZMET TANIMLAMA */}
              {activeTab === "hizmetler" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">
                    {isTr ? "4. Hizmetlerinizi Tanımlayın" : isEn ? "4. Define Your Services" : isRu ? "4. Настройка услуг" : "4. حدد خدماتك"}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {isTr ? "İşletmenizde sunduğunuz tüm işlemleri sisteme yükleyin:" : isEn ? "Upload all treatments and services you offer to the system:" : isRu ? "Загрузите в систему все процедуры и услуги:" : "قم بتحميل جميع العمليات والخدمات التي تقدمها في عملك إلى النظام:"}
                  </p>
                  <ol className="space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
                    <li>{isTr ? "Sol menüden Hizmetler sekmesine girin." : isEn ? "Go to Services on the left menu." : isRu ? "Перейдите во вкладку Услуги в левом меню." : "انتقل إلى علامة تبويب الخدمات من القائمة اليسرى."}</li>
                    <li>{isTr ? "+ Yeni Hizmet butonuna tıklayın." : isEn ? "Click + New Service." : isRu ? "Нажмите + Новая услуга." : "انقر فوق زر + خدمة جديدة."}</li>
                    <li>{isTr ? "Bilgileri doldurun: Hizmet adı, kategorisi, süresi (takvimde işlem süresini kilitler) ve fiyatı girin." : isEn ? "Fill details: enter service name, category, duration (blocks calendar slot), and price." : isRu ? "Заполните данные: название, категория, длительность (блокирует слот в календаре) и цена." : "املاً المعلومات: اسم الخدمة، الفئة، المدة (تحجز وقت العملية في التقويم) والسعر."}</li>
                    <li>{isTr ? "Kaydet butonuna basın." : isEn ? "Press Save." : isRu ? "Нажмите Сохранить." : "اضغط على زر حفظ."}</li>
                  </ol>
                </div>
              )}

              {/* 5. PERSONEL & YETKİLER */}
              {activeTab === "personel" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">
                    {isTr ? "5. Personellerinizi ve Yetkileri Ekleyin" : isEn ? "5. Add Staff & Permissions" : isRu ? "5. Добавление персонала и прав" : "5. أضف الموظفين والصلاحيات"}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {isTr ? "Ekibinizdeki her uzman için ayrı takvim ve yetki tanımlayabilirsiniz:" : isEn ? "Set up calendar and roles for each professional in your team:" : isRu ? "Настройте отдельный календарь и права для каждого специалиста:" : "يمكنك تحديد تقويم وصلاحيات منفصلة لكل متخصص في فريقك:"}
                  </p>
                  <ol className="space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
                    <li>{isTr ? "Sol menüden Personel sekmesine girin." : isEn ? "Go to Staff on the left menu." : isRu ? "Перейдите во вкладку Персонал в левом меню." : "انتقل إلى علامة تبويب الموظفين من القائمة اليسرى."}</li>
                    <li>{isTr ? "+ Personel Ekle / Davet Et butonuna tıklayın." : isEn ? "Click + Add / Invite Staff." : isRu ? "Нажмите + Добавить / Пригласить сотрудника." : "انقر فوق زر + إضافة / دعوة موظف."}</li>
                    <li>{isTr ? "Personelin adını, telefonunu, çalışma günlerini ve takvimde görünecek rengini seçin." : isEn ? "Select staff name, phone, work days, and calendar display color." : isRu ? "Укажите имя, телефон, рабочие дни и цвет сотрудника в календаре." : "اختر اسم الموظف وهاتفه وأيام عمله ولونه الذي سيظهر في التقويم."}</li>
                    <li>{isTr ? "Yetki Rolü Belirleyin: Yönetici (Tüm yetkiler) veya Personel (Yalnızca kendi randevularını görebilme) rollerini atayın." : isEn ? "Assign Role: Admin (Full access) or Staff (Can only see own appointments)." : isRu ? "Роль: Администратор (полный доступ) или Персонал (видят только свои записи)." : "تحديد دور الصلاحية: تعيين أدوار مدير (جميع الصلاحيات) أو موظف (رؤية مواعيده الخاصة فقط)."}</li>
                    <li>{isTr ? "Maaş & Komisyon Tanımı: Personel detay sayfasından Taban Maaş ve % Komisyon Oranı belirleyin." : isEn ? "Salary & Commission: Set Base Salary and % Commission rate from staff details." : isRu ? "Оклад и комиссия: укажите базовый оклад и % комиссии на странице деталей." : "تعريف الراتب والعمولة: حدد الراتب الأساسي ونسبة العمولات % من صفحة تفاصيل الموظف."}</li>
                  </ol>
                </div>
              )}

              {/* 6. TAKVİM & RANDEVU */}
              {activeTab === "takvim" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">
                    {isTr ? "6. Takvim & Randevu Yönetimi" : isEn ? "6. Calendar & Appointment Management" : isRu ? "6. Управление календарем и записями" : "6. إدارة التقويم والمواعيد"}
                  </h2>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <h4 className="font-semibold text-foreground">
                      {isTr ? "Tıklayarak Anında Randevu Oluşturma:" : isEn ? "Click to Book Instantly:" : isRu ? "Создание записи в один клик:" : "إنشاء موعد فوري بالضغط:"}
                    </h4>
                    <p>
                      {isTr 
                        ? "Takvim ekranında boş bir saat dilimine veya bir uzmanın sütununa tıkladığınızda, seçtiğiniz Tarih, Saat ve Personel otomatik doldurulmuş olarak Yeni Randevu modalı açılır."
                        : isEn 
                        ? "When you click a vacant slot or staff column on the calendar, the New Appointment dialog opens with Date, Time, and Staff pre-filled."
                        : isRu 
                        ? "При нажатии на свободный слот или колонку сотрудника откроется окно новой записи с предзаполненными Датой, Временем и Специалистом."
                        : "عندما تضغط على خانة وقت فارغة أو عمود أحد المتخصصين في شاشة التقويم، يفتح نموذج موعد جديد مع ملء التاريخ والوقت والموظف تلقائياً."}
                    </p>
                    <h4 className="font-semibold text-foreground mt-4">
                      {isTr ? "Takvimi Özelleştirme ve Filtreleme:" : isEn ? "Customize & Filter Calendar:" : isRu ? "Кастомизация и фильтрация:" : "تخصيص وتصفية التقويم:"}
                    </h4>
                    <p>
                      {isTr 
                        ? "Takviminizi Gün, Hafta veya Ay bazında görüntüleyebilirsiniz. Personel filtresini kullanarak tüm uzmanları yan yana sütunlar halinde kıyaslayabilir veya tek bir personelin programına odaklanabilirsiniz."
                        : isEn 
                        ? "View calendar by Day, Week, or Month. Compare all staff columns side-by-side or focus on a single staff member's schedule."
                        : isRu 
                        ? "Просматривайте календарь по дням, неделям или месяцам. Сравнивайте графики сотрудников рядом или сфокусируйтесь на одном человеке."
                        : "يمكنك عرض تقويمك على أساس يومي أو أسبوعي أو شهري. باستخدام فلتر الموظفين، يمكنك مقارنة جميع المتخصصين جنباً إلى جنب في أعمدة أو التركيز على جدول موظف واحد."}
                    </p>
                  </div>
                </div>
              )}

              {/* 7. ADİSYON & FİŞ YAZMA */}
              {activeTab === "adisyon" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">
                    {isTr ? "7. Adisyon Oluşturma & Fiş Çıkarma" : isEn ? "7. Ticket & Receipt Printing" : isRu ? "7. Создание чеков и печать" : "7. إنشاء الفاتورة وطباعة الإيصال"}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {isTr ? "SiriPlan panelinde tamamlanan randevular için profesyonel adisyon ve fiş dökümü mevcuttur:" : isEn ? "Professional receipts and billing are available for completed appointments:" : isRu ? "Профессиональные чеки и квитанции доступны для завершенных приемов:" : "تتوفر فواتير وإيصالات احترافية للمواعيد المكتملة في لوحة SiriPlan:"}
                  </p>
                  <ol className="space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
                    <li>{isTr ? "Randevunun üzerine tıklayıp detay sayfasında bulunan \"Adisyon\" butonuna tıklayın." : isEn ? "Click on the appointment and press the \"Adisyon\" (Receipt) button." : isRu ? "Нажмите на запись и выберите кнопку «Чек»." : "انقر فوق الموعد واضغط على زر \"الفاتورة\" الموجود في صفحة التفاصيل."}</li>
                    <li>{isTr ? "Adisyon içeriğinde: İşletme Logosu, İşletme Adı, Adres, Telefon, Hizmet(ler), Bahşiş ve Toplam Tutar ile Ödeme Yöntemi görünür." : isEn ? "Receipt content displays: Business Logo, Name, Address, Phone, Services, Tip, Total Amount, and Payment Method." : isRu ? "В чеке выводятся: логотип, название компании, адрес, телефон, услуги, чаевые, общая сумма и способ оплаты." : "في محتوى الفاتورة يظهر: شعار العمل، اسم العمل، العنوان، الهاتف، الخدمة (الخدمات)، الإكرامية، والمبلغ الإجمالي مع طريقة الدفع."}</li>
                    <li>{isTr ? "Sağ üstteki \"Yazdır\" butonu ile adisyonu doğrudan termal yazıcıya gönderebilir veya PDF olarak kaydedebilirsiniz." : isEn ? "Use \"Print\" in top right to send to a thermal printer directly or save as PDF." : isRu ? "Нажмите «Печать» вверху справа для вывода на термопринтер или сохранения в PDF." : "باستخدام زر \"طباعة\" في أعلى اليمين، يمكنك إرسال الفاتورة مباشرة إلى الطابعة الحرارية أو حفظها كملف PDF."}</li>
                  </ol>
                </div>
              )}

              {/* 8. WEB VİTRİNİ */}
              {activeTab === "vitrin" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">
                    {isTr ? "8. İşletme Web Sitesi & Vitrin Görünümü (/r/[slug])" : isEn ? "8. Business Website & Online Booking (/r/[slug])" : isRu ? "8. Веб-сайт и витрина компании (/r/[slug])" : "8. موقع العمل الإلكتروني ومظهر المعرض (/r/[slug])"}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {isTr ? "Müşterilerinizin 7/24 online randevu alabileceği ve salonunuzu inceleyebileceği özel bir web vitrini sunulur:" : isEn ? "A dedicated booking page is provided for 24/7 online customer scheduling and salon showcase:" : isRu ? "Специальная страница для онлайн-записи клиентов 24/7 и витрины вашего салона:" : "يتم تقديم معرض ويب خاص لعملائك لحجز المواعيد عبر الإنترنت على مدار الساعة طوال أيام الأسبوع واستكشاف صالونك:"}
                  </p>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    <li>
                      <b>{isTr ? "Özel Web Adresi:" : isEn ? "Custom Web Address:" : isRu ? "Уникальный веб-адрес:" : "عنوان ويب مخصص:"}</b>{" "}
                      {isTr ? "Her işletmeye özel siriplan.com/r/isletme-adiniz şeklinde şık bir bağlantı tanımlanır." : isEn ? "A elegant link like siriplan.com/r/your-business-name is assigned to your business." : isRu ? "Красивая ссылка вида siriplan.com/r/имя-компании закрепляется за вашим бизнесом." : "يتم تحديد رابط أنيق خاص بكل عمل على شكل siriplan.com/r/اسم-عملك."}
                    </li>
                    <li>
                      <b>{isTr ? "Resim & Görsel Yükleme:" : isEn ? "Upload Gallery & Images:" : isRu ? "Загрузка изображений:" : "تحميل الصور والمرئيات:"}</b>{" "}
                      {isTr ? "Ayarlar → Genel sayfasından salonunuzun Logosunu, Kapak Görselini ve Salon Galeri Fotoğraflarını yükleyebilirsiniz. Fotoğraflar vitrin sayfasında estetik şekilde listelenir." : isEn ? "Upload Logo, Cover, and Gallery photos from Settings → General to display beautifully on your public page." : isRu ? "Загрузите логотип, обложку и фото галереи в Настройки → Общие для красивого отображения на сайте." : "يمكنك تحميل شعار صالونك وصورة الغلاف وصور معرض الصالون من صفحة الإعدادات ← عام. يتم سرد الصور بشكل جمالي في صفحة المعرض."}
                    </li>
                    <li>
                      <b>{isTr ? "Online Randevu Sihirbazı:" : isEn ? "Online Booking Wizard:" : isRu ? "Онлайн-запись:" : "معالج الحجز عبر الإنترنت:"}</b>{" "}
                      {isTr ? "Müşterileriniz profilinize girerek sırasıyla Hizmet → Personel → Tarih ve Saat seçip saniyeler içinde randevu oluşturabilirler." : isEn ? "Customers browse, select Service → Staff → Date/Time, and book in seconds." : isRu ? "Клиенты могут выбрать Услугу → Специалиста → Дату/Время и записаться за пару кликов." : "يمكن لعملائك الدخول إلى ملفك التعريفي واختيار الخدمة ← الموظف ← التاريخ والوقت على التوالي، وإنشاء موعد في غضون ثوانٍ."}
                    </li>
                  </ul>
                </div>
              )}

              {/* 9. BİLDİRİM AYARLARI */}
              {activeTab === "whatsapp" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">
                    {isTr ? "9. Otomatik WhatsApp / SMS Bildirimleri" : isEn ? "9. Automated WhatsApp / SMS Notifications" : isRu ? "9. Автоматические уведомления WhatsApp / SMS" : "9. إشعارات واتساب / الرسائل القصيرة التلقائية"}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {isTr ? "Müşterilerinizin randevuyu unutmasını engellemenin en pratik yolu!" : isEn ? "The most practical way to prevent client no-shows!" : isRu ? "Самый практичный способ предотвратить неявку клиентов!" : "الطريقة الأكثر عملية لمنع عملائك من نسيان الموعد!"}
                  </p>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    <li>
                      <b>{isTr ? "Ayarlar → Bildirimler:" : isEn ? "Settings → Notifications:" : isRu ? "Настройки → Уведомления:" : "الإعدادات ← الإشعارات:"}</b>{" "}
                      {isTr ? "bölümüne gidip WhatsApp, SMS veya Telegram entegrasyonunu aktif edin." : isEn ? "Activate WhatsApp, SMS, or Telegram integrations." : isRu ? "Включите интеграцию с WhatsApp, SMS или Telegram." : "انتقل إلى القسم وقم بتفعيل تكامل واتساب أو الرسائل القصيرة أو تليجرام."}
                    </li>
                    <li>
                      <b>{isTr ? "Otomatik Mesaj Türleri:" : isEn ? "Auto Message Types:" : isRu ? "Типы автосообщений:" : "أنواع الرسائل التلقائية:"}</b>{" "}
                      {isTr ? "Randevu Oluşturuldu, Hatırlatma (randevudan 2 saat veya 1 gün önce) ve İptal/Değişiklik bildirimleri otomatik olarak gider." : isEn ? "Booking Confirmation, Reminders (2h or 1d before), and Cancellations/Changes send automatically." : isRu ? "Подтверждение записи, напоминания (за 2 часа или за день) и сообщения об отменах отправляются автоматически." : "تذهب إشعارات تم إنشاء الموعد، والتذكير (قبل ساعتين أو يوم واحد من الموعد) والإلغاء/التغيير تلقائياً."}
                    </li>
                    <li>
                      <b>{isTr ? "Mesaj Tonu:" : isEn ? "Message Tone:" : isRu ? "Тон сообщений:" : "نبرة الرسالة:"}</b>{" "}
                      {isTr ? "Sıcak, Resmi veya Kısa stillerden salon konseptinize uygun olanı seçin." : isEn ? "Choose Warm, Formal, or Short styles depending on your salon's concept." : isRu ? "Выберите теплый, официальный или краткий стиль общения под концепцию салона." : "اختر من بين الأساليب الودية أو الرسمية أو القصيرة ما يناسب مفهوم صالونك."}
                    </li>
                  </ul>
                </div>
              )}

              {/* 10. TELEGRAM BOTU */}
              {activeTab === "telegram" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">
                    {isTr ? "10. Telegram Bildirim Botu (@siriplan_bot Kurulumu)" : isEn ? "10. Telegram Notification Bot Setup (@siriplan_bot)" : isRu ? "10. Настройка Telegram-бота уведомлений (@siriplan_bot)" : "10. بوت إشعارات تليجرام (إعداد @siriplan_bot)"}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {isTr ? "Yeni randevu taleplerinde telefonunuza anında ücretsiz bildirim almak için:" : isEn ? "Receive instant free notifications on your phone for new appointment requests:" : isRu ? "Получайте мгновенные бесплатные уведомления на телефон о новых записях:" : "لتلقي إشعارات مجانية فورية على هاتفك لطلبات المواعيد الجديدة:"}
                  </p>
                  <ol className="space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
                    <li>{isTr ? "Telegram uygulamasında arama kısmına @siriplan_bot yazın, botu açıp \"Başlat / Start\" butonuna basın." : isEn ? "Search @siriplan_bot in Telegram, open the bot, and click \"Start\"." : isRu ? "Найдите в Telegram бота @siriplan_bot, откройте его и нажмите «Старт»." : "اكتب @siriplan_bot في قسم البحث في تطبيق تليجرام، وافتح البوت واضغط على زر \"بدء / Start\"."}</li>
                    <li>{isTr ? "Botun size verdiği sayısal Chat ID numarasını kopyalayın." : isEn ? "Copy the numeric Chat ID provided by the bot." : isRu ? "Скопируйте числовой Chat ID, предоставленный ботом." : "قم بنسخ رقم معرف الدردشة (Chat ID) الرقمي الذي يقدمه البوت لك."}</li>
                    <li>{isTr ? "SiriPlan panelinde Ayarlar → Bildirimler alanındaki \"Telegram Chat ID\" kutusuna yapıştırıp kaydedin." : isEn ? "Paste it in the \"Telegram Chat ID\" field in Settings → Notifications on your SiriPlan panel." : isRu ? "Вставьте его в поле Telegram Chat ID во вкладке Настройки → Уведомления в панели SiriPlan." : "قم بلصقه في مربع \"معرف دردشة تليجرام\" في منطقة الإعدادات ← الإشعارات في لوحة SiriPlan واحفظه."}</li>
                  </ol>
                </div>
              )}

              {/* 11. TOPLU KAMPANYALAR */}
              {activeTab === "kampanya" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">
                    {isTr ? "11. Toplu WhatsApp Kampanyaları" : isEn ? "11. Bulk WhatsApp Campaigns" : isRu ? "11. Массовые рассылки WhatsApp" : "11. حملات واتساب الجماعية"}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {isTr ? "Boş günleri doldurmak veya özel kampanyalar yapmak için müşterilerinize toplu mesaj gönderin:" : isEn ? "Send bulk messages to your clients to fill empty slots or promote campaigns:" : isRu ? "Отправляйте массовые сообщения клиентам, чтобы заполнить пустые дни или предложить скидки:" : "أرسل رسائل جماعية لعملائك لملء الأيام الفارغة أو تقديم حملات خاصة:"}
                  </p>
                  <ol className="space-y-3 list-decimal pl-5 text-sm text-muted-foreground">
                    <li>{isTr ? "Kampanyalar sekmesine tıklayın ve + Yeni Kampanya butonuna basın." : isEn ? "Go to Campaigns tab and click + New Campaign." : isRu ? "Перейдите во вкладку Рассылки и нажмите + Новая рассылка." : "انقر فوق علامة تبويب الحملات واضغط على زر + حملة جديدة."}</li>
                    <li>{isTr ? "Mesaj metnini yazın ve dinamik değişkenleri kullanın: Merhaba {{musteri_adi}}, {{salon_adi}}..." : isEn ? "Write the text using dynamic variables: Hello {{musteri_adi}}, {{salon_adi}}..." : isRu ? "Напишите текст, используя переменные: Здравствуйте, {{musteri_adi}}, {{salon_adi}}..." : "اكتب نص الرسالة واستخدم المتغيرات الديناميكية: مرحباً {{musteri_adi}}، {{salon_adi}}..."}</li>
                    <li>{isTr ? "İstediğiniz müşteri grubunu filtreleyin (Örn: Son 30 gündür gelmeyenler) ve gönderimi başlatın." : isEn ? "Filter the desired segment (e.g. inactive for last 30 days) and start sending." : isRu ? "Отфильтруйте группу клиентов (например, не приходившие более 30 дней) и запустите отправку." : "قم بتصفية مجموعة العملاء التي تريدها (مثال: الذين لم يحضروا خلال الـ 30 يوماً الماضية) وابدأ الإرسال."}</li>
                  </ol>
                </div>
              )}

              {/* 12. ÖDEME & ABONELİK */}
              {activeTab === "abonelik" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">
                    {isTr ? "12. Abonelik & Plan Yönetimi" : isEn ? "12. Subscription & Plan Management" : isRu ? "12. Подписки и тарифы" : "12. إدارة الاشتراك والخطة"}
                  </h2>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      {isTr 
                        ? "Planlar: Starter, Pro ve Business planlarının tamamı sabit ve şeffaf yapıdadır; teklif alma / temsilci bekleme adımı yoktur. Her yeni hesap 14 gün ücretsiz deneme ile başlar."
                        : isEn 
                        ? "Plans: Starter, Pro, and Business plans are fixed and transparent. No requests for quote or waiting for agents. Every account starts with a 14-day free trial."
                        : isRu 
                        ? "Тарифы: Тарифы Starter, Pro и Business фиксированы и прозрачны. Без запросов котировок или ожидания менеджеров. Каждый аккаунт начинает с 14-дневного триала."
                        : "الخطط: جميع خطط Starter و Pro و Business ثابتة وشفافة؛ لا توجد خطوة للحصول على عرض أسعار / انتظار ممثل. يبدأ كل حساب جديد بتجربة مجانية لمدة 14 يومًا."}
                    </p>
                    <p>
                      {isTr 
                        ? "Plan bilgileriniz: Mevcut planınızı, kullanım limitlerinizi ve fatura geçmişinizi Ayarlar → Abonelik sayfasından görüntüleyebilirsiniz."
                        : isEn 
                        ? "Plan Details: View your current plan, limits, and billing history under Settings → Subscription."
                        : isRu 
                        ? "Детали: Просматривайте тарифный план, лимиты и историю счетов в Настройки → Подписка."
                        : "معلومات خطتك: يمكنك عرض خطتك الحالية وحدود الاستخدام وسجل الفواتير من صفحة الإعدادات ← الاشتراك."}
                    </p>
                    <p>
                      {isTr 
                        ? "Aboneliğiniz SiriPlan hesabınıza bağlıdır ve uygulama mağazalarından bağımsız olarak yönetilir. Plan yükseltme, yenileme veya faturalandırmayla ilgili sorularınız için destek ekibimizle iletişime geçin: info@bysirius.com · WhatsApp +90 535 503 26 34."
                        : isEn 
                        ? "Your subscription is linked to SiriPlan and managed independently of app stores. For questions about upgrades or billing, contact support: info@bysirius.com · WhatsApp +90 535 503 26 34."
                        : isRu 
                        ? "Ваша подписка привязана к аккаунту SiriPlan. По вопросам повышения тарифа или оплаты пишите в поддержку: info@bysirius.com · WhatsApp +90 535 503 26 34."
                        : "اشتراكك مرتبط بحساب SiriPlan الخاص بك ويتم إدارته بشكل مستقل عن متاجر التطبيقات. للأسئلة المتعلقة بترقية الخطة أو التجديد أو الفواتير، اتصل بفريق الدعم: info@bysirius.com · واتساب +90 535 503 26 34."}
                    </p>
                  </div>
                </div>
              )}

              {/* 13. SADAKAT PUANLARI */}
              {activeTab === "sadakat" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">
                    {isTr ? "13. Müşteri Yönetimi & Sadakat Puanları" : isEn ? "13. CRM & Loyalty Points" : isRu ? "13. Клиенты и программа лояльности" : "13. إدارة العملاء ونقاط الولاء"}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {isTr ? "Müşterilerinizin bağlılığını artırmak için sadakat puanı altyapısını kullanın:" : isEn ? "Increase customer retention by using loyalty points feature:" : isRu ? "Повышайте лояльность клиентов с помощью бонусных баллов:" : "استخدم نظام نقاط الولاء لزيادة ولاء عملائك:"}
                  </p>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    <li>
                      <b>{isTr ? "Müşteri Geçmişi:" : isEn ? "Customer History:" : isRu ? "История клиента:" : "تاريخ العميل:"}</b>{" "}
                      {isTr ? "Müşteri detay sayfasından geçmiş tüm işlemlerini ve özel notlarını inceleyin." : isEn ? "Review past bookings, receipts, and custom notes from the customer details page." : isRu ? "Просматривайте все прошлые визиты и заметки на детальной странице клиента." : "راجع جميع المعاملات السابقة والملاحظات الخاصة بالعميل من صفحة تفاصيل العميل."}
                    </li>
                    <li>
                      <b>{isTr ? "Sadakat Puanı:" : isEn ? "Loyalty Points:" : isRu ? "Бонусные баллы:" : "نقاط الولاء:"}</b>{" "}
                      {isTr ? "Her tamamlanan randevuda müşterilerinize otomatik puan kazandırabilirsiniz. Hangi hizmetlerin sadakat kartı kazandıracağını Hizmetler sekmesinden ayarlayabilirsiniz." : isEn ? "Award points automatically on completed appointments. Configure which services award points under Services tab." : isRu ? "Начисляйте баллы автоматически за визиты. Настройте начисление баллов во вкладке Услуги." : "يمكنك كسب عملاءك نقاطاً تلقائية في كل موعد مكتمل. يمكنك ضبط الخدمات التي تمنح نقاط ولاء من علامة تبويب الخدمات."}
                    </li>
                  </ul>
                </div>
              )}

              {/* 14. GELİR-GİDER & MAAŞ */}
              {activeTab === "maas" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">
                    {isTr ? "14. Gelir-Gider Takibi & Personel Maaş Hesaplama" : isEn ? "14. Cash Book & Staff Payroll" : isRu ? "14. Финансы и расчет зарплат" : "14. متابعة الإيرادات والمصروفات وحساب رواتب الموظفين"}
                  </h2>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    <li>
                      <b>{isTr ? "Kasa Yönetimi:" : isEn ? "Cash Management:" : isRu ? "Управление кассой:" : "إدارة الصندوق:"}</b>{" "}
                      {isTr ? "Kira, malzeme alımı, çay-faturalar gibi tüm harcamaları Gelir-Gider sekmesinden kaydederek net kârınızı izleyin." : isEn ? "Track expenses like rent, products, and utilities in Income/Expense to monitor net profit." : isRu ? "Записывайте расходы на аренду, материалы и счета в Финансы, чтобы контролировать чистую прибыль." : "قم بتسجيل جميع النفقات مثل الإيجار وشراء المواد وفواتير الشاي والمرافق من علامة تبويب الإيرادات والمصروفات لمراقبة صافي ربحك."}
                    </li>
                    <li>
                      <b>{isTr ? "Personel Maaş & Komisyon:" : isEn ? "Staff Payroll & Commission:" : isRu ? "Зарплаты и комиссии:" : "رواتب الموظفين والعمولات:"}</b>{" "}
                      {isTr 
                        ? "Personel → Maaş Hesapla sayfasından o ayki toplam ödemeyi tek tıkla hesaplayın: Taban Maaş + (Yapılan Ciro × Komisyon %) + Bahşişler. Ödeme tamamlandığında tek tıkla gider olarak kasaya işleyin."
                        : isEn 
                        ? "Calculate monthly payroll in Staff → Salary page: Base Salary + (Service Volume x Commission %) + Tips. Book as expense in cash book with a single click once paid."
                        : isRu 
                        ? "Рассчитывайте выплаты в Персонал → Расчет зарплаты: Оклад + (Оборот x % Комиссии) + Чаевые. Запишите в расходы одним нажатием после выплаты."
                        : "احسب إجمالي المدفوعات لذلك الشهر بنقرة واحدة من صفحة الموظفين ← حساب الرواتب: الراتب الأساسي + (الأرباح المحققة × نسبة العمولة %) + الإكراميات. عند اكتمال الدفع، سجله كمصروف في الصندوق بنقرة واحدة."}
                    </li>
                  </ul>
                </div>
              )}

              {/* 15. RAPORLAR & VERİ GÖÇÜ */}
              {activeTab === "raporlar" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">
                    {isTr ? "15. Raporlar ve Veri Göçü (Excel)" : isEn ? "15. Reports & Data Migration" : isRu ? "15. Отчеты и импорт данных" : "15. التقارير وهجرة البيانات (Excel)"}
                  </h2>
                  <ul className="space-y-3 list-disc pl-5 text-sm text-muted-foreground">
                    <li>
                      <b>{isTr ? "Detaylı Raporlar:" : isEn ? "Detailed Reports:" : isRu ? "Подробные отчеты:" : "تقارير مفصلة:"}</b>{" "}
                      {isTr ? "Günlük/haftalık randevu sayıları, ciro grafikleri, en çok tercih edilen hizmetler ve personel performanslarını analiz edin." : isEn ? "Analyze daily/weekly appointments, revenue charts, top services, and staff performance." : isRu ? "Анализируйте ежедневные приемы, графики выручки, популярные услуги и продуктивность персонала." : "قم بتحليل أعداد المواعيد اليومية/الأسبوعية، ومخططات الأرباح، والخدمات الأكثر تفضيلاً، وأداء الموظفين."}
                    </li>
                    <li>
                      <b>{isTr ? "Excel/CSV Aktarımı:" : isEn ? "Excel/CSV Export & Import:" : isRu ? "Импорт/экспорт Excel:" : "نقل Excel/CSV:"}</b>{" "}
                      {isTr ? "Eski müşteri listenizi Veri Göçü sayfasından Excel dosyasıyla tek tıkla yükleyin veya tüm verilerinizi yedeklemek için JSON/CSV olarak dışarı aktarın." : isEn ? "Upload your old customer list via Excel on the Data Migration page, or export your database as JSON/CSV." : isRu ? "Загружайте базу клиентов из Excel во вкладке Импорт данных или скачивайте резервную копию в JSON/CSV." : "قم بتحميل قائمة عملائك القدامى بملف Excel بنقرة واحدة من صفحة هجرة البيانات أو قم بتصديرها بتنسيق JSON/CSV لنسخ بياناتك احتياطياً."}
                    </li>
                  </ul>
                </div>
              )}

              {/* 16. SIK SORULAN SORULAR */}
              {activeTab === "sss" && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-foreground">
                    {isTr ? "16. Sık Sorulan Sorular (SSS)" : isEn ? "16. Frequently Asked Questions (FAQ)" : isRu ? "16. Часто задаваемые вопросы (FAQ)" : "16. الأسئلة الشائعة (FAQ)"}
                  </h2>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {isTr ? "Telegram randevu bildirimlerini nasıl açabilirim?" : isEn ? "How can I enable Telegram booking notifications?" : isRu ? "Как включить уведомления о записях в Telegram?" : "كيف يمكنني تفعيل إشعارات مواعيد تليجرام؟"}
                      </h4>
                      <p className="text-muted-foreground mt-1">
                        {isTr 
                          ? "Telegram'da @siriplan_bot botuna mesaj atıp /start butonuna basın. Size verilen Chat ID numarasını Ayarlar sekmesindeki Telegram alanına yapıştırın."
                          : isEn 
                          ? "Send a message to @siriplan_bot on Telegram and press /start. Paste the provided Chat ID into the Telegram field under Settings."
                          : isRu 
                          ? "Отправьте сообщение боту @siriplan_bot в Telegram и нажмите /start. Вставьте полученный Chat ID в поле Telegram в Настройках."
                          : "أرسل رسالة إلى البوت @siriplan_bot في تليجرام واضغط على زر /start. الصق رقم معرف الدردشة (Chat ID) المقدم لك في حقل تليجرام في علامة تبويب الإعدادات."}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {isTr ? "Business planı için teklif mi istemeliyim?" : isEn ? "Should I request a custom quote for the Business plan?" : isRu ? "Нужно ли запрашивать котировку для тарифа Business?" : "هل يجب أن أطلب عرض أسعار لخطة Business؟"}
                      </h4>
                      <p className="text-muted-foreground mt-1">
                        {isTr ? "Hayır, Business dahil tüm planlar sabit ve şeffaf yapıdadır; teklif alma adımı yoktur." : isEn ? "No, all plans including Business are fixed and transparent. There is no quote request step." : isRu ? "Нет, все тарифы, включая Business, фиксированы и прозрачны. Запросы не требуются." : "لا، جميع الخطط بما في ذلك Business ثابتة وشفافة؛ لا توجد خطوة لطلب عرض أسعار."}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {isTr ? "Planımı nereden görebilirim?" : isEn ? "Where can I view my active plan?" : isRu ? "Где я могу увидеть свой активный тариф?" : "أين يمكنني رؤية خطتي؟"}
                      </h4>
                      <p className="text-muted-foreground mt-1">
                        {isTr 
                          ? "Ayarlar → Abonelik sayfasından mevcut planınızı, kullanım limitlerinizi ve fatura geçmişinizi görüntüleyebilirsiniz. Plan ve faturalandırma sorularınız için: info@bysirius.com"
                          : isEn 
                          ? "You can view your active plan, usage limits, and invoice history under Settings → Subscription. For billing questions: info@bysirius.com"
                          : isRu 
                          ? "Вы можете проверить текущий тариф, лимиты и счета в Настройки → Подписка. По вопросам оплаты: info@bysirius.com"
                          : "يمكنك عرض خطتك الحالية وحدود الاستخدام وسجل الفواتير من صفحة الإعدادات ← الاشتراك. للأسئلة المتعلقة بالخطة والفواتير: info@bysirius.com"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 🎬 İNTERAKTİF SUNUM (19 SLAYT) */}
              {activeTab === "sunum" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        {isTr ? "🎬 SiriPlan İnteraktif Sunum" : isEn ? "🎬 SiriPlan Interactive Presentation" : isRu ? "🎬 SiriPlan Интерактивная презентация" : "🎬 عرض SiriPlan التفاعلي"}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {isTr ? "Kullanım kılavuzunu 19 slaytlık görsel slayt gösterisi olarak inceleyin." : isEn ? "Review the user guide as a 19-slide visual slideshow." : isRu ? "Изучите руководство пользователя в виде визуального слайд-шоу из 19 слайдов." : "راجع دليل الاستخدام كعرض شرائح مرئي مكون من 19 شريحة."}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsFullscreenSunum(!isFullscreenSunum)}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <Maximize2 className="w-4 h-4" /> {isTr ? "Tam Ekran Modu" : isEn ? "Fullscreen Mode" : isRu ? "Полноэкранный режим" : "وضع ملء الشاشة"}
                    </Button>
                  </div>

                  {isFullscreenSunum ? (
                    <div className="fixed inset-0 z-50 bg-black flex flex-col">
                      <div className="p-4 bg-background border-b border-border flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          {isTr ? "SiriPlan İnteraktif Sunum" : isEn ? "SiriPlan Interactive Presentation" : isRu ? "SiriPlan Интерактивная презентация" : "عرض SiriPlan التفاعلي"}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setIsFullscreenSunum(false)} className="cursor-pointer">
                          {isTr ? "Kapat (ESC)" : isEn ? "Close (ESC)" : isRu ? "Закрыть (ESC)" : "إغلاق (ESC)"}
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
                      <strong>{isTr ? "Fikri Mülkiyet Koruması:" : isEn ? "Intellectual Property Protection:" : isRu ? "Защита интеллектуальной собственности:" : "حماية الملكية الفكرية:"}</strong>{" "}
                      {isTr 
                        ? "Bu interaktif sunum dosyası oturum doğrulamalı güvenli API üzerinden çekilmektedir. Harici platformlarda paylaşılamaz veya kopyalanamaz." 
                        : isEn 
                        ? "This interactive presentation file is retrieved over a secure session-validated API. It cannot be shared or copied on external platforms." 
                        : isRu 
                        ? "Этот интерактивный файл презентации извлекается через безопасный API с проверкой сессии. Его нельзя публиковать или копировать на внешних платформах." 
                        : "يتم استرداد ملف العرض التقديمي التفاعلي هذا عبر واجهة برمجة تطبيقات آمنة تم التحقق من صحة جلستها. لا يمكن مشاركته أو نسخه على منصات خارجية."}
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
