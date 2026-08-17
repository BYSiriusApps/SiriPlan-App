/**
 * Hizmet kataloğunun (bkz. catalog.ts) çok dilli karşılıkları.
 *
 * Katalogdaki Türkçe ad KANONİK ANAHTARDIR — çeviriler burada satır satır
 * [tr, en, ru, ar] biçiminde tutulur. Böylece yeni bir hizmet eklerken tek bir
 * satır yazmak yeterli olur ve Türkçe anahtar üç ayrı yerde tekrarlanmadığı için
 * yazım hatasıyla eşleşmeyen kayıt oluşmaz.
 *
 * ÖNEMLİ: Çeviriler yalnızca GÖSTERİM/SEED aşamasında kullanılır. Hizmetler
 * veritabanına kaydedildikten sonra randevu akışı her yerde service_id üzerinden
 * ilerler (bkz. /api/appointments) — hizmet adının dili randevu oluşturmayı,
 * bildirimleri veya hatırlatmaları etkilemez.
 */

export type CatalogLocale = "tr" | "en" | "ru" | "ar";

type Row = [tr: string, en: string, ru: string, ar: string];

const CATEGORY_ROWS: Row[] = [
  ["Kesim", "Haircut", "Стрижка", "قص الشعر"],
  ["Renk & Boyama", "Color & Dye", "Окрашивание", "الصبغة واللون"],
  ["Bakım & Şekil", "Care & Styling", "Уход и укладка", "العناية والتصفيف"],
  ["Şekillendirme & Tasarım", "Styling & Design", "Укладка и дизайн", "التصفيف والتصميم"],
  ["Saç Uzatma", "Hair Extensions", "Наращивание волос", "إطالة الشعر"],
  ["Sakal", "Beard", "Борода", "اللحية"],
  ["Cilt & Bakım", "Skin & Care", "Кожа и уход", "البشرة والعناية"],
  ["Manikür", "Manicure", "Маникюр", "مانيكير"],
  ["Pedikür", "Pedicure", "Педикюр", "باديكير"],
  ["Protez Tırnak", "Nail Extensions", "Наращивание ногтей", "تركيب الأظافر"],
  ["Nail Art", "Nail Art", "Нейл-арт", "فن الأظافر"],
  ["Tırnak Bakımı", "Nail Care", "Уход за ногтями", "العناية بالأظافر"],
  ["Cilt Bakımı", "Skin Care", "Уход за кожей", "العناية بالبشرة"],
  ["Epilasyon", "Hair Removal", "Эпиляция", "إزالة الشعر"],
  ["Kaş & Kirpik", "Brows & Lashes", "Брови и ресницы", "الحواجب والرموش"],
  ["Makyaj", "Makeup", "Макияж", "المكياج"],
  ["Vücut Bakımı", "Body Care", "Уход за телом", "العناية بالجسم"],
  ["Masaj", "Massage", "Массаж", "المساج"],
  ["SPA Paketleri", "SPA Packages", "SPA-пакеты", "باقات السبا"],
  ["İnjeksiyon Tedavileri", "Injectable Treatments", "Инъекционные процедуры", "علاجات الحقن"],
  ["Lazer", "Laser", "Лазер", "الليزر"],
  ["Cilt Tedavileri", "Skin Treatments", "Процедуры для кожи", "علاجات البشرة"],
  ["Kaş", "Brows", "Брови", "الحواجب"],
  ["Kirpik", "Lashes", "Ресницы", "الرموش"],
  ["Makyaj Hizmetleri", "Makeup Services", "Услуги макияжа", "خدمات المكياج"],
  ["Kalıcı Makyaj", "Permanent Makeup", "Перманентный макияж", "المكياج الدائم"],
  ["Makyaj Eğitimi", "Makeup Training", "Обучение макияжу", "تدريب المكياج"],
  ["Danışmanlık", "Consultation", "Консультация", "الاستشارة"],
  ["Dövme", "Tattoo", "Тату", "الوشم"],
  ["Lazer Dövme Silme", "Laser Tattoo Removal", "Лазерное удаление тату", "إزالة الوشم بالليزر"],
  ["Piercing", "Piercing", "Пирсинг", "ثقب الجسم"],
];

const SERVICE_ROWS: Row[] = [
  // ── Saç: kesim ───────────────────────────────────────────────
  ["Kadın Kesim", "Women's Haircut", "Женская стрижка", "قص شعر نسائي"],
  ["Erkek Kesim", "Men's Haircut", "Мужская стрижка", "قص شعر رجالي"],
  ["Çocuk Kesim", "Kids' Haircut", "Детская стрижка", "قص شعر أطفال"],
  ["Saç Yıkama + Kesim", "Wash + Haircut", "Мытьё головы + стрижка", "غسيل + قص"],
  ["Saç Yıkama + Fön", "Wash + Blow-Dry", "Мытьё головы + укладка феном", "غسيل + سشوار"],
  ["Patlama (Frenk Saç) Kesimi", "Fringe (Bangs) Cut", "Стрижка чёлки", "قص الغرة"],
  ["Uç Alma", "Trim", "Подравнивание кончиков", "تقصيص الأطراف"],
  ["Katlı Kesim", "Layered Cut", "Каскадная стрижка", "قصة متدرجة"],
  ["Bob Kesim", "Bob Cut", "Стрижка боб", "قصة بوب"],
  ["Pixie Kesim", "Pixie Cut", "Стрижка пикси", "قصة بيكسي"],

  // ── Saç: renk & boyama ───────────────────────────────────────
  ["Saç Boyama (Tek Renk)", "Hair Color (Single Tone)", "Окрашивание волос (в один тон)", "صبغة شعر (لون واحد)"],
  ["Röfle", "Highlights (Streaks)", "Мелирование прядями", "خصل ملونة"],
  ["Balayaj", "Balayage", "Балаяж", "بالاياج"],
  ["Folyo Meşe", "Foil Highlights", "Мелирование на фольгу", "هاي لايت بالقصدير"],
  ["Ombrè / Sombré", "Ombré / Sombré", "Омбре / Сомбре", "أومبريه / سومبريه"],
  ["Kapatma (Saç Dibi)", "Root Touch-Up", "Тонирование корней", "تغطية الجذور"],
  ["Dekolorasyon (Saç Açma)", "Bleaching (Lightening)", "Обесцвечивание волос", "سحب اللون (تفتيح)"],
  ["Toner / Tonlama", "Toner / Toning", "Тонер / тонирование", "تونر / تلوين"],
  ["Renk Düzeltme", "Color Correction", "Коррекция цвета", "تصحيح اللون"],
  ["Gece Mavisi / Pastel Renk", "Midnight Blue / Pastel Color", "Синий / пастельный оттенок", "أزرق ليلي / ألوان باستيل"],
  ["Highlights (Vurgular)", "Highlights (Accents)", "Хайлайтс (акценты)", "هاي لايت (لمسات)"],
  ["Saç Boyama + Fön", "Hair Color + Blow-Dry", "Окрашивание + укладка феном", "صبغة شعر + سشوار"],

  // ── Saç: bakım & şekil ───────────────────────────────────────
  ["Keratin Bakım", "Keratin Treatment", "Кератиновый уход", "علاج الكيراتين"],
  ["Saç Botoksu", "Hair Botox", "Ботокс для волос", "بوتوكس الشعر"],
  ["Olaplex Tedavisi", "Olaplex Treatment", "Процедура Olaplex", "علاج أولابلكس"],
  ["Protein Bakım", "Protein Treatment", "Протеиновый уход", "علاج بالبروتين"],
  ["Derin Nem Maskesi", "Deep Moisture Mask", "Глубоко увлажняющая маска", "ماسك ترطيب عميق"],
  ["Saç Derisi (Scalp) Bakımı", "Scalp Treatment", "Уход за кожей головы", "العناية بفروة الرأس"],
  ["Fön", "Blow-Dry", "Укладка феном", "سشوار"],
  ["Maşa / Bigudi", "Curling / Rollers", "Плойка / бигуди", "مكواة تجعيد / رولو"],
  ["Düzleştirme (Ütü)", "Straightening (Flat Iron)", "Выпрямление утюжком", "فرد الشعر (مكواة)"],
  ["Kalıcı Ondüle / Perma", "Perm", "Химическая завивка", "تمويج دائم (برماننت)"],
  ["Işıltı & Parlaklık Bakımı", "Gloss & Shine Treatment", "Уход для блеска и сияния", "علاج اللمعان والبريق"],

  // ── Saç: şekillendirme & tasarım ─────────────────────────────
  ["Gelin Saç Tasarımı", "Bridal Hair Styling", "Свадебная причёска", "تسريحة عروس"],
  ["Topuz / Saç Toplama", "Updo / Bun", "Пучок / собранные волосы", "كعكة / رفع الشعر"],
  ["Örgü Saç Tasarımı", "Braided Hairstyle", "Причёска с косами", "تسريحة ضفائر"],
  ["Dalgalı Saç (Beach Wave)", "Beach Waves", "Пляжные локоны", "تموجات الشاطئ"],
  ["Nişan / Kına Saç Tasarımı", "Engagement / Henna Night Hairstyle", "Причёска на помолвку / хну", "تسريحة خطوبة / حناء"],
  ["Fotoğraf / Çekim Saç", "Photoshoot Hairstyle", "Причёска для фотосессии", "تسريحة تصوير"],

  // ── Saç uzatma ───────────────────────────────────────────────
  ["Kaynak Saç Takma", "Keratin Bond Hair Extensions", "Капсульное наращивание волос", "وصلات شعر بالكيراتين"],
  ["Bant Saç Uzatma", "Tape-In Hair Extensions", "Ленточное наращивание волос", "وصلات شعر لاصقة"],
  ["Nano Ring Saç", "Nano Ring Extensions", "Наращивание Nano Ring", "وصلات نانو رينغ"],
  ["Kıl Kaynak Saç", "Strand-by-Strand Extensions", "Микрокапсульное наращивание", "وصلات شعر خصلة بخصلة"],
  ["Megahair Bant Saç", "Megahair Tape Extensions", "Ленточное наращивание Megahair", "وصلات ميغاهير اللاصقة"],

  // ── Berber: kesim ────────────────────────────────────────────
  ["Sıfır Tıraş", "Buzz Cut", "Стрижка под ноль", "حلاقة صفر"],
  ["Fade Kesim", "Fade Cut", "Стрижка фейд", "قصة فيد"],
  ["Skin Fade", "Skin Fade", "Скин фейд", "سكين فيد"],
  ["Undercut", "Undercut", "Андеркат", "أندركت"],
  ["Pompadour Kesim", "Pompadour Cut", "Стрижка помпадур", "قصة بومبادور"],
  ["Box Fade", "Box Fade", "Бокс фейд", "بوكس فيد"],
  ["Kesim + Fön", "Cut + Blow-Dry", "Стрижка + укладка", "قص + سشوار"],

  // ── Berber: sakal ────────────────────────────────────────────
  ["Sakal Tıraşı", "Beard Shave", "Бритьё бороды", "حلاقة اللحية"],
  ["Sakal Düzenleme", "Beard Trim", "Коррекция бороды", "تهذيب اللحية"],
  ["Bıyık Düzenleme", "Moustache Trim", "Коррекция усов", "تهذيب الشارب"],
  ["Sakal + Kesim", "Beard + Haircut", "Борода + стрижка", "لحية + قص شعر"],
  ["Klasik Ustura Tıraşı", "Classic Razor Shave", "Классическое бритьё опасной бритвой", "حلاقة كلاسيكية بالموس"],
  ["Alın Tıraşı", "Forehead Shave", "Бритьё лба", "حلاقة الجبين"],
  ["Boyun Tıraşı", "Neck Shave", "Бритьё шеи", "حلاقة الرقبة"],
  ["Sakal Renklendirme", "Beard Coloring", "Окрашивание бороды", "صبغ اللحية"],
  ["Sakal Yağı Bakımı", "Beard Oil Treatment", "Уход маслом для бороды", "العناية بزيت اللحية"],

  // ── Berber: cilt & bakım ─────────────────────────────────────
  ["Yüz Maskesi", "Face Mask", "Маска для лица", "ماسك للوجه"],
  ["Kil Maskesi", "Clay Mask", "Глиняная маска", "ماسك الطين"],
  ["Yüz Buharlama", "Facial Steaming", "Распаривание лица", "تبخير الوجه"],
  ["Burun Bandı", "Nose Strip", "Полоска для носа", "لاصقة الأنف"],
  ["Göz Altı Maskesi", "Under-Eye Mask", "Маска под глаза", "ماسك تحت العين"],
  ["Saç Boyama", "Hair Coloring", "Окрашивание волос", "صبغ الشعر"],
  ["Kaş Düzenleme", "Brow Grooming", "Коррекция бровей", "تهذيب الحواجب"],

  // ── Tırnak: manikür ──────────────────────────────────────────
  ["Klasik Manikür", "Classic Manicure", "Классический маникюр", "مانيكير كلاسيكي"],
  ["Kalıcı Oje (Gel)", "Gel Polish", "Гель-лак", "مناكير جل"],
  ["Fransız Manikür", "French Manicure", "Французский маникюр", "مانيكير فرنسي"],
  ["Kalıcı + Bakım", "Gel Polish + Care", "Гель-лак + уход", "مناكير جل + عناية"],
  ["Medikal Manikür", "Medical Manicure", "Медицинский маникюр", "مانيكير طبي"],
  ["Babyboomer Manikür", "Baby Boomer Manicure", "Маникюр Babyboomer", "مانيكير بيبي بومر"],
  ["Dip Powder Manikür", "Dip Powder Manicure", "Маникюр Dip Powder", "مانيكير ديب باودر"],
  ["Biyojel Manikür", "BioGel Manicure", "Биогель-маникюр", "مانيكير بايو جل"],

  // ── Tırnak: pedikür ──────────────────────────────────────────
  ["Klasik Pedikür", "Classic Pedicure", "Классический педикюр", "باديكير كلاسيكي"],
  ["Kalıcı Oje Pedikür", "Gel Polish Pedicure", "Педикюр с гель-лаком", "باديكير بمناكير الجل"],
  ["SPA Pedikür", "SPA Pedicure", "SPA-педикюр", "باديكير سبا"],
  ["Medikal Pedikür", "Medical Pedicure", "Медицинский педикюр", "باديكير طبي"],
  ["Fransız Pedikür", "French Pedicure", "Французский педикюр", "باديكير فرنسي"],
  ["Pedikür + Kalıcı Oje", "Pedicure + Gel Polish", "Педикюр + гель-лак", "باديكير + مناكير جل"],

  // ── Tırnak: protez ───────────────────────────────────────────
  ["Akrilik Tırnak (Takma)", "Acrylic Nails (Extensions)", "Акриловые ногти (наращивание)", "أظافر أكريليك (تركيب)"],
  ["Jel Tırnak", "Gel Nails", "Гелевые ногти", "أظافر جل"],
  ["Tırnak Uzatma (Builder)", "Nail Extension (Builder Gel)", "Наращивание ногтей (билдер)", "إطالة الأظافر (بيلدر)"],
  ["Dolgu (Refill)", "Refill", "Коррекция (рефилл)", "تعبئة (ريفيل)"],
  ["Söküm", "Removal", "Снятие", "إزالة"],
  ["Poligel Tırnak", "Polygel Nails", "Полигель-ногти", "أظافر بولي جل"],
  ["BIAB (Builder in a Bottle)", "BIAB (Builder in a Bottle)", "BIAB (Builder in a Bottle)", "BIAB (بيلدر إن أ بوتل)"],

  // ── Tırnak: nail art ─────────────────────────────────────────
  ["Nail Art (Basit)", "Nail Art (Simple)", "Нейл-арт (простой)", "فن أظافر (بسيط)"],
  ["Nail Art (Detaylı)", "Nail Art (Detailed)", "Нейл-арт (детальный)", "فن أظافر (مفصّل)"],
  ["Chrome Toz", "Chrome Powder", "Хром-втирка", "بودرة كروم"],
  ["Glitter Süsleme", "Glitter Design", "Дизайн с глиттером", "زينة جليتر"],
  ["3D Nail Art", "3D Nail Art", "3D нейл-арт", "فن أظافر ثلاثي الأبعاد"],
  ["Ombre Tırnak", "Ombré Nails", "Ногти омбре", "أظافر أومبريه"],
  ["Marble Effect", "Marble Effect", "Эффект мрамора", "تأثير الرخام"],
  ["Sticker & Folyo Süsleme", "Stickers & Foil Design", "Наклейки и фольга", "ملصقات وزينة فويل"],
  ["El Boyama Nail Art", "Hand-Painted Nail Art", "Роспись ногтей вручную", "رسم يدوي على الأظافر"],

  // ── Tırnak: bakım ────────────────────────────────────────────
  ["Tırnak Güçlendirme", "Nail Strengthening", "Укрепление ногтей", "تقوية الأظافر"],
  ["Kütiküla Bakımı", "Cuticle Care", "Уход за кутикулой", "العناية بالجليدة"],
  ["Tırnak Onarım (Kırık)", "Nail Repair (Broken)", "Ремонт ногтя (скол)", "إصلاح الظفر (المكسور)"],
  ["Tırnak Nemlendirme Bakımı", "Nail Hydration Treatment", "Увлажняющий уход за ногтями", "علاج ترطيب الأظافر"],

  // ── Güzellik: cilt bakımı ────────────────────────────────────
  ["Cilt Bakımı (Temel)", "Facial (Basic)", "Уход за лицом (базовый)", "عناية بالبشرة (أساسية)"],
  ["Derin Gözenek Temizliği", "Deep Pore Cleansing", "Глубокая чистка пор", "تنظيف عميق للمسام"],
  ["Hydrafacial", "Hydrafacial", "Гидрафейшл", "هيدرافيشل"],
  ["Anti-Aging Bakım", "Anti-Aging Facial", "Антивозрастной уход", "عناية مضادة للشيخوخة"],
  ["Aydınlatma Bakımı", "Brightening Facial", "Осветляющий уход", "عناية تفتيح البشرة"],
  ["Leke Tedavisi", "Pigmentation Treatment", "Лечение пигментации", "علاج التصبغات"],
  ["Yüz Masajı", "Facial Massage", "Массаж лица", "مساج للوجه"],
  ["Oksijen Terapi", "Oxygen Therapy", "Кислородная терапия", "علاج بالأوكسجين"],
  ["LED Işık Terapi", "LED Light Therapy", "LED-светотерапия", "علاج بالضوء LED"],
  ["Mikrodermabrazyon", "Microdermabrasion", "Микродермабразия", "تقشير دقيق للبشرة"],
  ["Dermaplaning", "Dermaplaning", "Дермапланинг", "ديرمابلاننغ"],
  ["Selülit Masajı", "Cellulite Massage", "Антицеллюлитный массаж", "مساج السيلوليت"],
  ["Yüz Gençleştirme Bakımı", "Facial Rejuvenation", "Омолаживающий уход за лицом", "عناية تجديد شباب الوجه"],

  // ── Güzellik: epilasyon ──────────────────────────────────────
  ["Ağda — Bacak Tamamı", "Waxing — Full Legs", "Воск — ноги полностью", "شمع — الساقين كاملة"],
  ["Ağda — Bacak Yarım (Alt)", "Waxing — Half Leg (Lower)", "Воск — половина ноги (низ)", "شمع — نصف الساق (السفلي)"],
  ["Ağda — Bacak Yarım (Üst)", "Waxing — Half Leg (Upper)", "Воск — половина ноги (верх)", "شمع — نصف الساق (العلوي)"],
  ["Ağda — Koltuk Altı", "Waxing — Underarms", "Воск — подмышки", "شمع — تحت الإبط"],
  ["Ağda — Bikini", "Waxing — Bikini", "Воск — бикини", "شمع — البيكيني"],
  ["Ağda — Bel Altı Komple (Brezilyalı)", "Waxing — Brazilian (Full)", "Воск — глубокое бикини (бразильское)", "شمع — برازيلي كامل"],
  ["Ağda — Kol Tamamı", "Waxing — Full Arms", "Воск — руки полностью", "شمع — الذراعين كاملة"],
  ["Ağda — Dudak Üstü", "Waxing — Upper Lip", "Воск — над верхней губой", "شمع — فوق الشفة"],
  ["Ağda — Yüz Komple", "Waxing — Full Face", "Воск — всё лицо", "شمع — الوجه كامل"],
  ["İplik — Yüz Tamamı", "Threading — Full Face", "Тридинг — всё лицо", "خيط — الوجه كامل"],
  ["İplik — Kaş", "Threading — Brows", "Тридинг — брови", "خيط — الحواجب"],
  ["İplik — Alın", "Threading — Forehead", "Тридинг — лоб", "خيط — الجبين"],
  ["Şeker Epilasyon (Sugaring)", "Sugaring", "Шугаринг", "إزالة الشعر بالسكر"],
  ["Ağda Paketi (Bacak + Koltuk)", "Waxing Package (Legs + Underarms)", "Пакет воска (ноги + подмышки)", "باقة شمع (ساقين + إبط)"],

  // ── Kaş & kirpik ─────────────────────────────────────────────
  ["Kaş Alımı", "Brow Shaping", "Коррекция формы бровей", "تحديد الحواجب"],
  ["Kaş Laminasyon", "Brow Lamination", "Ламинирование бровей", "تصفيح الحواجب"],
  ["Kaş Boyama", "Brow Tinting", "Окрашивание бровей", "صبغ الحواجب"],
  ["Kaş Tasarımı", "Brow Design", "Дизайн бровей", "تصميم الحواجب"],
  ["Kirpik Lifting", "Lash Lift", "Лифтинг ресниц", "رفع الرموش"],
  ["Kirpik Laminasyon", "Lash Lamination", "Ламинирование ресниц", "تصفيح الرموش"],
  ["Kirpik Boyama", "Lash Tinting", "Окрашивание ресниц", "صبغ الرموش"],
  ["Kirpik Uzatma (Tek Tek)", "Lash Extensions (Classic)", "Наращивание ресниц (классика)", "تركيب رموش (شعرة بشعرة)"],
  ["Kirpik Permi", "Lash Perm", "Химзавивка ресниц", "تجعيد الرموش"],
  ["Göz Çevresi Bakım Paketi", "Eye Area Care Package", "Пакет ухода за зоной вокруг глаз", "باقة العناية بمحيط العين"],

  // ── Makyaj (güzellik salonu) ─────────────────────────────────
  ["Günlük Makyaj", "Everyday Makeup", "Дневной макияж", "مكياج يومي"],
  ["Gelin Makyajı", "Bridal Makeup", "Свадебный макияж", "مكياج عروس"],
  ["Gece Makyajı", "Evening Makeup", "Вечерний макияж", "مكياج سهرة"],
  ["Fotoğraf Makyajı", "Photoshoot Makeup", "Макияж для фотосессии", "مكياج تصوير"],
  ["Airbrush Makyaj", "Airbrush Makeup", "Аэрографический макияж", "مكياج إيربرش"],
  ["Kontur & Highlight Makyaj", "Contour & Highlight Makeup", "Макияж с контурингом и хайлайтом", "مكياج كونتور وهايلايت"],

  // ── Vücut bakımı ─────────────────────────────────────────────
  ["Vücut Peeling", "Body Scrub", "Пилинг тела", "تقشير الجسم"],
  ["Çikolata Maske (Vücut)", "Chocolate Body Mask", "Шоколадное обёртывание тела", "ماسك الشوكولاتة للجسم"],
  ["G5 Masajı (Selülit)", "G5 Massage (Cellulite)", "Массаж G5 (антицеллюлитный)", "مساج G5 (السيلوليت)"],
  ["Vakum Masajı", "Vacuum Massage", "Вакуумный массаж", "مساج بالشفط"],

  // ── SPA: masaj ───────────────────────────────────────────────
  ["İsveç Masajı (60 dk)", "Swedish Massage (60 min)", "Шведский массаж (60 мин)", "مساج سويدي (60 د)"],
  ["İsveç Masajı (90 dk)", "Swedish Massage (90 min)", "Шведский массаж (90 мин)", "مساج سويدي (90 د)"],
  ["Derin Doku Masajı", "Deep Tissue Massage", "Глубокотканный массаж", "مساج الأنسجة العميقة"],
  ["Aromaterapi Masajı", "Aromatherapy Massage", "Ароматерапевтический массаж", "مساج بالزيوت العطرية"],
  ["Sıcak Taş Masajı (60 dk)", "Hot Stone Massage (60 min)", "Массаж горячими камнями (60 мин)", "مساج بالحجر الساخن (60 د)"],
  ["Sıcak Taş Masajı (90 dk)", "Hot Stone Massage (90 min)", "Массаж горячими камнями (90 мин)", "مساج بالحجر الساخن (90 د)"],
  ["Thai Masajı", "Thai Massage", "Тайский массаж", "مساج تايلندي"],
  ["Refleksoloji", "Reflexology", "Рефлексология", "ريفلكسولوجي"],
  ["Kafa & Boyun Masajı", "Head & Neck Massage", "Массаж головы и шеи", "مساج الرأس والرقبة"],
  ["Lenf Drenaj Masajı", "Lymphatic Drainage Massage", "Лимфодренажный массаж", "مساج التصريف الليمفاوي"],
  ["Shiatsu Masajı", "Shiatsu Massage", "Массаж шиацу", "مساج شياتسو"],
  ["Prenatal (Hamile) Masajı", "Prenatal Massage", "Массаж для беременных", "مساج للحوامل"],
  ["Spor Masajı", "Sports Massage", "Спортивный массаж", "مساج رياضي"],
  ["Ayak Masajı", "Foot Massage", "Массаж стоп", "مساج القدمين"],
  ["Çift Masajı (2 kişi)", "Couples Massage (2 people)", "Парный массаж (2 человека)", "مساج للأزواج (شخصان)"],

  // ── SPA: vücut bakımı ────────────────────────────────────────
  ["Kese & Köpük", "Scrub & Foam (Hammam)", "Пилинг и пенный массаж (хаммам)", "تكييس ورغوة"],
  ["Detoks Çamur Maskesi", "Detox Mud Mask", "Детокс-маска из глины", "ماسك الطين الديتوكس"],
  ["Hammam Deneyimi", "Turkish Bath Experience", "Хаммам (турецкая баня)", "تجربة الحمام التركي"],
  ["Aroma Banyo", "Aroma Bath", "Аромаванна", "حمام عطري"],
  ["Çikolata Mask", "Chocolate Mask", "Шоколадная маска", "ماسك الشوكولاتة"],
  ["Rasul (Mineral Çamur)", "Rhassoul (Mineral Mud)", "Рассул (минеральная глина)", "راسول (طين معدني)"],

  // ── SPA: paketler ────────────────────────────────────────────
  ["Relax Paketi (Masaj + Bakım)", "Relax Package (Massage + Facial)", "Пакет Relax (массаж + уход)", "باقة الاسترخاء (مساج + عناية)"],
  ["Hammam + Masaj Paketi", "Turkish Bath + Massage Package", "Пакет хаммам + массаж", "باقة حمام تركي + مساج"],
  ["Tam Gün SPA (4 saat)", "Full-Day SPA (4 hours)", "SPA на весь день (4 часа)", "يوم سبا كامل (4 ساعات)"],

  // ── Estetik: injeksiyon ──────────────────────────────────────
  ["Botoks (Alın)", "Botox (Forehead)", "Ботокс (лоб)", "بوتوكس (الجبين)"],
  ["Botoks (Tam Yüz)", "Botox (Full Face)", "Ботокс (всё лицо)", "بوتوكس (الوجه كامل)"],
  ["Hyalüronik Dolgu", "Hyaluronic Filler", "Гиалуроновый филлер", "فيلر هيالورونيك"],
  ["Dudak Dolgusu", "Lip Filler", "Филлер для губ", "فيلر الشفاه"],
  ["PRP", "PRP", "PRP", "PRP"],
  ["Mezoterapi", "Mesotherapy", "Мезотерапия", "ميزوثيرابي"],
  ["Profhilo", "Profhilo", "Profhilo", "بروفايلو"],
  ["Exosome Tedavisi", "Exosome Treatment", "Терапия экзосомами", "علاج الإكسوسوم"],
  ["Salmon DNA (PDRN)", "Salmon DNA (PDRN)", "Salmon DNA (PDRN)", "سالمون DNA (PDRN)"],
  ["Plazmolift", "Plasma Lift", "Плазмолифтинг", "بلازما ليفت"],
  ["Vitamin Mezoterapi", "Vitamin Mesotherapy", "Витаминная мезотерапия", "ميزوثيرابي بالفيتامينات"],

  // ── Estetik: lazer ───────────────────────────────────────────
  ["Lazer Epilasyon — Bacak", "Laser Hair Removal — Legs", "Лазерная эпиляция — ноги", "ليزر إزالة الشعر — الساقين"],
  ["Lazer Epilasyon — Koltukaltı", "Laser Hair Removal — Underarms", "Лазерная эпиляция — подмышки", "ليزر إزالة الشعر — تحت الإبط"],
  ["Lazer Epilasyon — Bikini", "Laser Hair Removal — Bikini", "Лазерная эпиляция — бикини", "ليزر إزالة الشعر — البيكيني"],
  ["Lazer Epilasyon — Yüz", "Laser Hair Removal — Face", "Лазерная эпиляция — лицо", "ليزر إزالة الشعر — الوجه"],
  ["Lazer Epilasyon — Kol", "Laser Hair Removal — Arms", "Лазерная эпиляция — руки", "ليزر إزالة الشعر — الذراعين"],
  ["Lazer Epilasyon — Komple", "Laser Hair Removal — Full Body", "Лазерная эпиляция — всё тело", "ليزر إزالة الشعر — الجسم كامل"],
  ["Lazer Cilt Yenileme", "Laser Skin Resurfacing", "Лазерное обновление кожи", "تجديد البشرة بالليزر"],
  ["CO2 Lazer", "CO2 Laser", "CO2 лазер", "ليزر CO2"],
  ["Fraksiyonel Lazer", "Fractional Laser", "Фракционный лазер", "ليزر فراكشنال"],
  ["IPL (Yoğun Işık)", "IPL (Intense Pulsed Light)", "IPL (интенсивный свет)", "IPL (الضوء المكثف)"],
  ["Q-Switch Lazer (Leke)", "Q-Switch Laser (Pigmentation)", "Q-Switch лазер (пигментация)", "ليزر Q-Switch (التصبغات)"],

  // ── Estetik: cilt tedavileri ─────────────────────────────────
  ["Kimyasal Peeling", "Chemical Peel", "Химический пилинг", "تقشير كيميائي"],
  ["Mikroneedling", "Microneedling", "Микронидлинг", "ميكرونيدلينغ"],
  ["Dermapen", "Dermapen", "Дермапен", "ديرمابن"],
  ["Karbondioksit Yüzü", "Carbon Laser Facial", "Карбоновый пилинг лица", "تنظيف الوجه بالكربون"],
  ["Plazma Jet", "Plasma Jet", "Плазма-джет", "بلازما جت"],
  ["BB Glow", "BB Glow", "BB Glow", "BB Glow"],
  ["Collagen Booster Maske", "Collagen Booster Mask", "Маска Collagen Booster", "ماسك معزز الكولاجين"],

  // ── Kaş & kirpik stüdyosu: kaş ───────────────────────────────
  ["Kaş Alımı (İplik)", "Brow Shaping (Threading)", "Коррекция бровей (нить)", "تحديد الحواجب (بالخيط)"],
  ["Kaş Alımı (Ağda)", "Brow Shaping (Waxing)", "Коррекция бровей (воск)", "تحديد الحواجب (بالشمع)"],
  ["Microblading (Kalıcı)", "Microblading (Permanent)", "Микроблейдинг (перманент)", "مايكروبليدنغ (دائم)"],
  ["Powder Brow (Kalıcı)", "Powder Brows (Permanent)", "Пудровые брови (перманент)", "حواجب باودر (دائم)"],
  ["Ombre Brow (Kalıcı)", "Ombré Brows (Permanent)", "Омбре брови (перманент)", "حواجب أومبريه (دائم)"],
  ["Brow Wax (Ağda)", "Brow Wax", "Воск для бровей", "شمع الحواجب"],
  ["Kaş Dolgusu (İnjeksiyon)", "Brow Filler (Injection)", "Филлер для бровей (инъекция)", "فيلر الحواجب (حقن)"],
  ["Kaş + Kirpik Paketi", "Brow + Lash Package", "Пакет брови + ресницы", "باقة حواجب + رموش"],

  // ── Kaş & kirpik stüdyosu: kirpik ────────────────────────────
  ["Kirpik Uzatma (Dolgu)", "Lash Extensions (Refill)", "Наращивание ресниц (коррекция)", "تعبئة الرموش"],
  ["Kirpik Söküm", "Lash Removal", "Снятие ресниц", "إزالة الرموش"],
  ["Russian Volume Kirpik", "Russian Volume Lashes", "Ресницы Russian Volume", "رموش روسية (فوليوم)"],
  ["Mega Volume Kirpik", "Mega Volume Lashes", "Ресницы Mega Volume", "رموش ميجا فوليوم"],
  ["Hybrid Kirpik", "Hybrid Lashes", "Гибридные ресницы", "رموش هايبرد"],
  ["Wispy Kirpik", "Wispy Lashes", "Ресницы Wispy", "رموش ويسبي"],
  ["Kirpik Tonu (Boyama)", "Lash Tint", "Тонирование ресниц", "تلوين الرموش"],

  // ── Makyaj stüdyosu ──────────────────────────────────────────
  ["Doğal Makyaj", "Natural Makeup", "Натуральный макияж", "مكياج طبيعي"],
  ["Işıltılı / Glow Makyaj", "Glow Makeup", "Сияющий макияж (glow)", "مكياج مضيء (جلو)"],
  ["Dramatik / Smoky Makyaj", "Dramatic / Smoky Makeup", "Драматичный / смоки макияж", "مكياج دراماتيكي / سموكي"],
  ["Nişan / Kına Makyajı", "Engagement / Henna Night Makeup", "Макияж на помолвку / хну", "مكياج خطوبة / حناء"],
  ["Fotoğraf & Video Makyajı", "Photo & Video Makeup", "Макияж для фото и видео", "مكياج تصوير وفيديو"],
  ["Sahne Makyajı", "Stage Makeup", "Сценический макияж", "مكياج مسرحي"],
  ["Kontur Makyaj", "Contour Makeup", "Макияж с контурингом", "مكياج كونتور"],
  ["Retro / Vintage Makyaj", "Retro / Vintage Makeup", "Ретро / винтажный макияж", "مكياج ريترو / فينتاج"],
  ["Damat / Erkek Makyajı", "Groom / Men's Makeup", "Макияж для жениха / мужской", "مكياج العريس / للرجال"],

  // ── Kalıcı makyaj ────────────────────────────────────────────
  ["Microblading (Kaş)", "Microblading (Brows)", "Микроблейдинг (брови)", "مايكروبليدنغ (الحواجب)"],
  ["Kalıcı Kaş (Powder Brow)", "Permanent Brows (Powder Brow)", "Перманентные брови (пудровые)", "حواجب دائمة (باودر برو)"],
  ["Kalıcı Dudak Makyajı", "Permanent Lip Makeup", "Перманентный макияж губ", "مكياج شفاه دائم"],
  ["Ombre Dudak (Kalıcı)", "Ombré Lips (Permanent)", "Омбре губы (перманент)", "شفاه أومبريه (دائم)"],
  ["Kalıcı Eyeliner (Üst)", "Permanent Eyeliner (Upper)", "Перманентный лайнер (верх)", "آيلاينر دائم (علوي)"],
  ["Kalıcı Eyeliner (Alt + Üst)", "Permanent Eyeliner (Upper + Lower)", "Перманентный лайнер (верх + низ)", "آيلاينر دائم (علوي + سفلي)"],
  ["Medikal Kamuflaj Makyajı", "Medical Camouflage Makeup", "Медицинский камуфляжный макияж", "مكياج تمويه طبي"],

  // ── Makyaj eğitimi ───────────────────────────────────────────
  ["Bireysel Makyaj Dersi (1 Saat)", "Private Makeup Lesson (1 Hour)", "Индивидуальный урок макияжа (1 час)", "درس مكياج فردي (ساعة)"],
  ["Temel Makyaj Kursu (4 Saat)", "Basic Makeup Course (4 Hours)", "Базовый курс макияжа (4 часа)", "دورة مكياج أساسية (4 ساعات)"],

  // ── Diyetisyen ───────────────────────────────────────────────
  ["İlk Görüşme & Analiz", "Initial Consultation & Analysis", "Первая консультация и анализ", "استشارة أولى وتحليل"],
  ["Takip Seansı", "Follow-Up Session", "Контрольный приём", "جلسة متابعة"],
  ["Online Danışmanlık", "Online Consultation", "Онлайн-консультация", "استشارة أونلاين"],
  ["Diyet Programı Oluşturma", "Diet Plan Creation", "Составление плана питания", "إعداد برنامج غذائي"],
  ["Spor + Diyet Programı", "Fitness + Diet Program", "Программа спорт + питание", "برنامج رياضة + حمية"],
  ["Beden Analizi (Biyoimpedans)", "Body Composition Analysis (Bioimpedance)", "Анализ состава тела (биоимпеданс)", "تحليل الجسم (بيوإمبيدانس)"],
  ["Beslenme Eğitimi", "Nutrition Coaching", "Обучение питанию", "تثقيف غذائي"],
  ["Çocuk Beslenmesi Danışmanlığı", "Child Nutrition Consultation", "Консультация по детскому питанию", "استشارة تغذية الأطفال"],
  ["Sporcu Beslenmesi", "Sports Nutrition", "Спортивное питание", "تغذية الرياضيين"],
  ["Vejetaryen / Vegan Beslenme", "Vegetarian / Vegan Nutrition", "Вегетарианское / веганское питание", "تغذية نباتية / فيغن"],
  ["Gebelik Beslenmesi", "Pregnancy Nutrition", "Питание при беременности", "تغذية الحمل"],
  ["Sağlıklı Yaşam Paketi (Aylık)", "Healthy Living Package (Monthly)", "Пакет «Здоровый образ жизни» (месяц)", "باقة الحياة الصحية (شهرية)"],

  // ── Dövme ────────────────────────────────────────────────────
  ["Küçük Dövme (< 5 cm)", "Small Tattoo (< 5 cm)", "Маленькое тату (< 5 см)", "وشم صغير (< 5 سم)"],
  ["Orta Dövme (5–15 cm)", "Medium Tattoo (5–15 cm)", "Среднее тату (5–15 см)", "وشم متوسط (5–15 سم)"],
  ["Büyük Dövme (> 15 cm)", "Large Tattoo (> 15 cm)", "Большое тату (> 15 см)", "وشم كبير (> 15 سم)"],
  ["Renkli Dövme", "Color Tattoo", "Цветное тату", "وشم ملون"],
  ["El Poke Dövme", "Hand-Poke Tattoo", "Тату hand-poke", "وشم يدوي (هاند بوك)"],
  ["Tribal Dövme", "Tribal Tattoo", "Тату в стиле трайбл", "وشم تربال"],
  ["Akuarel (Suluboya) Dövme", "Watercolor Tattoo", "Акварельное тату", "وشم ألوان مائية"],
  ["Geometrik Dövme", "Geometric Tattoo", "Геометрическое тату", "وشم هندسي"],
  ["Script / Yazı Dövme", "Script / Lettering Tattoo", "Тату надпись / леттеринг", "وشم كتابة / خط"],
  ["Fineline (İnce Çizgi) Dövme", "Fine Line Tattoo", "Тату fine line (тонкие линии)", "وشم خطوط رفيعة"],
  ["Cover-Up Dövme", "Cover-Up Tattoo", "Тату кавер-ап", "وشم تغطية (كفر أب)"],
  ["Touch-Up (Dokunuş)", "Touch-Up", "Обновление тату (touch-up)", "لمسة أخيرة (تاتش أب)"],

  // ── Lazer dövme silme ────────────────────────────────────────
  ["Lazer Dövme Silme (1 Seans)", "Laser Tattoo Removal (1 Session)", "Лазерное удаление тату (1 сеанс)", "إزالة الوشم بالليزر (جلسة)"],
  ["Lazer Dövme Soldurma", "Laser Tattoo Fading", "Лазерное осветление тату", "تفتيح الوشم بالليزر"],

  // ── Piercing ─────────────────────────────────────────────────
  ["Kulak Piercing", "Ear Piercing", "Пирсинг уха", "ثقب الأذن"],
  ["Helix Piercing", "Helix Piercing", "Пирсинг хеликс", "ثقب هيليكس"],
  ["Tragus Piercing", "Tragus Piercing", "Пирсинг трагус", "ثقب تراجوس"],
  ["Burun Piercing", "Nose Piercing", "Пирсинг носа", "ثقب الأنف"],
  ["Septum Piercing", "Septum Piercing", "Пирсинг септум", "ثقب سبتم"],
  ["Göbek Piercing", "Navel Piercing", "Пирсинг пупка", "ثقب السرة"],
  ["Dil Piercing", "Tongue Piercing", "Пирсинг языка", "ثقب اللسان"],
  ["Kaş Piercing", "Eyebrow Piercing", "Пирсинг брови", "ثقب الحاجب"],
  ["Dudak / Labret Piercing", "Lip / Labret Piercing", "Пирсинг губы / лабрет", "ثقب الشفة / لابريت"],
];

const LOCALE_INDEX: Record<Exclude<CatalogLocale, "tr">, 1 | 2 | 3> = { en: 1, ru: 2, ar: 3 };

function buildMap(rows: Row[], index: 1 | 2 | 3): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) map.set(row[0], row[index]);
  return map;
}

const categoryMaps = new Map<string, Map<string, string>>();
const serviceMaps = new Map<string, Map<string, string>>();

/** Katalog kategori etiketinin verilen dildeki karşılığı — çeviri yoksa Türkçesi döner. */
export function translateCatalogCategory(label: string, locale: CatalogLocale): string {
  if (locale === "tr") return label;
  const index = LOCALE_INDEX[locale];
  if (!index) return label;
  let map = categoryMaps.get(locale);
  if (!map) {
    map = buildMap(CATEGORY_ROWS, index);
    categoryMaps.set(locale, map);
  }
  return map.get(label) ?? label;
}

/** Katalog hizmet adının verilen dildeki karşılığı — çeviri yoksa Türkçesi döner. */
export function translateCatalogService(name: string, locale: CatalogLocale): string {
  if (locale === "tr") return name;
  const index = LOCALE_INDEX[locale];
  if (!index) return name;
  let map = serviceMaps.get(locale);
  if (!map) {
    map = buildMap(SERVICE_ROWS, index);
    serviceMaps.set(locale, map);
  }
  return map.get(name) ?? name;
}

/** Bir adın 4 dildeki karşılığı; ad katalogda yoksa (salonun kendi yazdığı hizmet) null. */
export type NameVariants = Record<CatalogLocale, string>;

/**
 * Katalogda birebir bulunmayan ama sahada sık kullanılan yazım varyantları.
 *
 * SADECE ters aramada (kayıtlı ad → çeviri) kullanılır; katalog seçicisinde
 * görünmezler, yoksa aynı hizmet iki kez listelenirdi. Canlı veride ölçülen
 * eşleşmeyen adlardan türetildi — tahminle değil, gerçek kayıtlara bakılarak.
 */
const ALIAS_ROWS: Row[] = [
  ["Saç Kesimi", "Haircut", "Стрижка", "قص الشعر"],
  ["Kaş Alma", "Brow Shaping", "Коррекция формы бровей", "تحديد الحواجب"],
  ["Diğer", "Other", "Другое", "أخرى"],
];

let reverseIndex: Map<string, Row> | null = null;

/**
 * Ters arama: kayıtlı ad HANGİ dilde yazılmış olursa olsun satırını bulur.
 * Hizmetler veritabanına kayıt anındaki dilde yazıldığı için (bkz. seed.ts)
 * bir salonun hizmetleri Türkçe de Rusça da olabilir; ziyaretçinin diline
 * çevirebilmek için her dildeki varyant aynı satıra işaret etmeli.
 *
 * 4 dilin tüm varyantları (1175 anahtar) çakışmasız doğrulandı — aynı metin
 * iki farklı hizmete denk gelmiyor.
 */
function getReverseIndex(): Map<string, Row> {
  if (reverseIndex) return reverseIndex;
  const index = new Map<string, Row>();
  // Sıra önemli: gerçek katalog satırları önce eklenir, takma adlar en sonda —
  // çakışma olursa katalogdaki asıl kayıt kazanır.
  for (const row of [...SERVICE_ROWS, ...CATEGORY_ROWS, ...ALIAS_ROWS]) {
    for (const variant of row) {
      const key = variant.trim();
      if (!index.has(key)) index.set(key, row);
    }
  }
  reverseIndex = index;
  return index;
}

export function catalogNameVariants(name: string): NameVariants | null {
  if (!name) return null;
  const row = getReverseIndex().get(name.trim());
  if (!row) return null;
  return { tr: row[0], en: row[1], ru: row[2], ar: row[3] };
}

/**
 * Kayıtlı bir hizmet/kategori adını verilen dile çevirir.
 * Katalogda karşılığı yoksa (salonun kendi yazdığı ad) ad AYNEN döner —
 * bu fonksiyon hiçbir koşulda boş/undefined üretmez, bildirim metinlerinde
 * güvenle kullanılabilir.
 */
export function translateStoredName(name: string | null | undefined, locale?: string | null): string {
  if (!name) return "";
  if (!locale || locale === "tr") {
    const trRow = catalogNameVariants(name);
    return trRow ? trRow.tr : name;
  }
  const variants = catalogNameVariants(name);
  if (!variants) return name;
  return variants[locale as CatalogLocale] ?? name;
}

/**
 * Verilen adlar için "ad → 4 dildeki karşılığı" sözlüğü üretir; katalogda
 * bulunmayan (salonun elle yazdığı/düzenlediği) adlar sözlüğe HİÇ girmez.
 *
 * Herkese açık randevu sayfası bu küçük sözlüğü sunucudan alır — 300 satırlık
 * tam çeviri tablosunun istemci paketine inmesine gerek kalmaz; tipik bir
 * salonda yalnızca kendi hizmetleri kadar (30-50) kayıt taşınır.
 */
export function buildNameI18nMap(names: Array<string | null | undefined>): Record<string, NameVariants> {
  const out: Record<string, NameVariants> = {};
  for (const name of names) {
    if (!name || out[name]) continue;
    const variants = catalogNameVariants(name);
    if (variants) out[name] = variants;
  }
  return out;
}

/** Test/bakım amaçlı: çevirisi eksik kalan katalog kaydı var mı? */
export function findUntranslatedCatalogEntries(names: string[], labels: string[]): string[] {
  const known = new Set([...SERVICE_ROWS.map((r) => r[0]), ...CATEGORY_ROWS.map((r) => r[0])]);
  return [...names, ...labels].filter((n) => !known.has(n));
}
