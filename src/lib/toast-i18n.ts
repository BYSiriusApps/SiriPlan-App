/**
 * Panelde `toast.*` ile gösterilen kısa bildirimlerin çok dilli metinleri.
 *
 * NEDEN next-intl DEĞİL: bu metinler olay işleyicilerinin (onClick/fetch .then)
 * içinde, çoğu kez hook çağrılamayan yerlerde üretilir; her bileşene
 * useTranslations eklemek davranışı değiştirmeden büyük bir diff demekti.
 * Dil, <html lang> (app/layout.tsx'te aktif locale ile basılır) üzerinden
 * çağrı anında okunur; okunamazsa Türkçe — yani bu fonksiyon hiçbir koşulda
 * boş metin döndürmez ve bir toast'ı asla engelleyemez.
 *
 * Sıra: [tr, en, ru, ar, de, es]. `{ad}` biçimli yer tutucular `vars` ile dolar.
 */
type Row = readonly [tr: string, en: string, ru: string, ar: string, de: string, es: string];

const LANG_INDEX: Record<string, number> = { tr: 0, en: 1, ru: 2, ar: 3, de: 4, es: 5 };

const M = {
  // ── Ortak ──
  conn: ["Bağlantı hatası.", "Connection error.", "Ошибка соединения.", "خطأ في الاتصال.", "Verbindungsfehler.", "Error de conexión."],
  connRetry: ["Bağlantı hatası — tekrar deneyin", "Connection error — please try again", "Ошибка соединения — повторите попытку", "خطأ في الاتصال — حاول مرة أخرى", "Verbindungsfehler – bitte erneut versuchen", "Error de conexión: inténtalo de nuevo"],
  loadFailed: ["Yüklenemedi", "Failed to load", "Не удалось загрузить", "تعذّر التحميل", "Laden fehlgeschlagen", "No se pudo cargar"],
  dataLoadFailed: ["Veriler yüklenemedi", "Failed to load data", "Не удалось загрузить данные", "تعذّر تحميل البيانات", "Daten konnten nicht geladen werden", "No se pudieron cargar los datos"],
  deleted: ["Silindi", "Deleted", "Удалено", "تم الحذف", "Gelöscht", "Eliminado"],
  deleteFailed: ["Silinemedi", "Could not delete", "Не удалось удалить", "تعذّر الحذف", "Löschen fehlgeschlagen", "No se pudo eliminar"],
  updateFailed: ["Güncellenemedi", "Could not update", "Не удалось обновить", "تعذّر التحديث", "Aktualisierung fehlgeschlagen", "No se pudo actualizar"],
  statusUpdated: ["Durum güncellendi", "Status updated", "Статус обновлён", "تم تحديث الحالة", "Status aktualisiert", "Estado actualizado"],
  saved: ["Kaydedildi", "Saved", "Сохранено", "تم الحفظ", "Gespeichert", "Guardado"],
  saveFailed: ["Kayıt başarısız", "Save failed", "Не удалось сохранить", "فشل الحفظ", "Speichern fehlgeschlagen", "No se pudo guardar"],
  addFailed: ["Eklenemedi", "Could not add", "Не удалось добавить", "تعذّرت الإضافة", "Hinzufügen fehlgeschlagen", "No se pudo añadir"],
  opFailed: ["İşlem başarısız", "Operation failed", "Операция не удалась", "فشلت العملية", "Vorgang fehlgeschlagen", "La operación falló"],
  nameRequired: ["İsim zorunlu", "Name is required", "Укажите имя", "الاسم مطلوب", "Name ist erforderlich", "El nombre es obligatorio"],
  phoneRequired: ["Telefon zorunlu", "Phone is required", "Укажите телефон", "رقم الهاتف مطلوب", "Telefonnummer ist erforderlich", "El teléfono es obligatorio"],
  dateRangeRequired: ["Tarih aralığı zorunlu", "Date range is required", "Укажите период", "النطاق الزمني مطلوب", "Zeitraum ist erforderlich", "El rango de fechas es obligatorio"],
  fillRequired: ["Lütfen zorunlu alanları doldurun", "Please fill in the required fields", "Заполните обязательные поля", "يرجى ملء الحقول المطلوبة", "Bitte füllen Sie die Pflichtfelder aus", "Completa los campos obligatorios"],
  validValue: ["Geçerli bir değer girin", "Enter a valid value", "Введите корректное значение", "أدخل قيمة صحيحة", "Geben Sie einen gültigen Wert ein", "Introduce un valor válido"],
  // ── Giriş / kayıt / şifre ──
  sessionNotFound: ["Oturum bulunamadı. Lütfen tekrar kayıt olun.", "Session not found. Please sign up again.", "Сессия не найдена. Зарегистрируйтесь заново.", "لم يتم العثور على الجلسة. يرجى التسجيل مجددًا.", "Sitzung nicht gefunden. Bitte registrieren Sie sich erneut.", "No se encontró la sesión. Regístrate de nuevo."],
  sendFailed: ["Gönderilemedi: {msg}", "Could not send: {msg}", "Не удалось отправить: {msg}", "تعذّر الإرسال: {msg}", "Senden fehlgeschlagen: {msg}", "No se pudo enviar: {msg}"],
  verifySent: ["Doğrulama e-postası tekrar gönderildi!", "Verification email sent again!", "Письмо для подтверждения отправлено повторно!", "تمت إعادة إرسال بريد التحقق!", "Bestätigungs-E-Mail erneut gesendet!", "¡Correo de verificación reenviado!"],
  loginFailed: ["Giriş başarısız: {msg}", "Sign-in failed: {msg}", "Не удалось войти: {msg}", "فشل تسجيل الدخول: {msg}", "Anmeldung fehlgeschlagen: {msg}", "Error al iniciar sesión: {msg}"],
  trialExpired: ["Ücretsiz deneme süreniz doldu. Devam etmek için bir plan seçmeniz gerekiyor.", "Your free trial has ended. Choose a plan to continue.", "Бесплатный пробный период закончился. Выберите тариф, чтобы продолжить.", "انتهت فترتك التجريبية المجانية. اختر خطة للمتابعة.", "Ihre kostenlose Testphase ist abgelaufen. Wählen Sie einen Tarif, um fortzufahren.", "Tu prueba gratuita ha terminado. Elige un plan para continuar."],
  pwMin8: ["Şifre en az 8 karakter olmalı.", "Password must be at least 8 characters.", "Пароль должен содержать не менее 8 символов.", "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.", "Das Passwort muss mindestens 8 Zeichen lang sein.", "La contraseña debe tener al menos 8 caracteres."],
  pwMismatch: ["Şifreler eşleşmiyor.", "Passwords do not match.", "Пароли не совпадают.", "كلمتا المرور غير متطابقتين.", "Die Passwörter stimmen nicht überein.", "Las contraseñas no coinciden."],
  pwUpdateFailed: ["Şifre güncellenemedi: {msg}", "Could not update password: {msg}", "Не удалось обновить пароль: {msg}", "تعذّر تحديث كلمة المرور: {msg}", "Passwort konnte nicht aktualisiert werden: {msg}", "No se pudo actualizar la contraseña: {msg}"],
  joinedOrg: ["{org} işletmesine katıldınız!", "You have joined {org}!", "Вы присоединились к {org}!", "لقد انضممت إلى {org}!", "Sie sind {org} beigetreten!", "¡Te has unido a {org}!"],
  fullNameRequired: ["Ad soyad girin", "Enter your full name", "Введите имя и фамилию", "أدخل الاسم الكامل", "Geben Sie Ihren vollständigen Namen ein", "Introduce tu nombre completo"],
  planSwitched: ["{plan} plana geçtiniz.", "You switched to the {plan} plan.", "Вы перешли на тариф {plan}.", "لقد انتقلت إلى خطة {plan}.", "Sie haben auf den Tarif {plan} gewechselt.", "Has cambiado al plan {plan}."],
  // ── Randevu / talepler / bekleme listesi ──
  apptApproved: ["Randevu onaylandı", "Appointment approved", "Запись подтверждена", "تمت الموافقة على الموعد", "Termin bestätigt", "Cita aprobada"],
  requestRejected: ["Talep reddedildi", "Request declined", "Запрос отклонён", "تم رفض الطلب", "Anfrage abgelehnt", "Solicitud rechazada"],
  newTimeProposed: ["Yeni saat önerildi, müşteri cevabı bekleniyor", "New time proposed, waiting for the customer's reply", "Предложено новое время, ожидаем ответ клиента", "تم اقتراح وقت جديد، بانتظار رد العميل", "Neue Uhrzeit vorgeschlagen, Antwort der Kundschaft ausstehend", "Nueva hora propuesta, esperando la respuesta del cliente"],
  requestCancelled: ["Randevu talebi iptal edildi", "Appointment request cancelled", "Запрос на запись отменён", "تم إلغاء طلب الموعد", "Terminanfrage storniert", "Solicitud de cita cancelada"],
  staffChanged: ["Personel değiştirildi", "Staff member changed", "Сотрудник изменён", "تم تغيير الموظف", "Mitarbeitende/r geändert", "Profesional cambiado"],
  nameAndPhoneRequired: ["Ad ve telefon zorunlu", "Name and phone are required", "Укажите имя и телефон", "الاسم والهاتف مطلوبان", "Name und Telefonnummer sind erforderlich", "El nombre y el teléfono son obligatorios"],
  addedToWaitlist: ["Bekleme listesine eklendi", "Added to the waitlist", "Добавлено в список ожидания", "تمت الإضافة إلى قائمة الانتظار", "Zur Warteliste hinzugefügt", "Añadido a la lista de espera"],
  recordDeleted: ["Kayıt silindi", "Record deleted", "Запись удалена", "تم حذف السجل", "Eintrag gelöscht", "Registro eliminado"],
  apptFieldsRequired: ["Personel, en az bir hizmet ve tarih/saat zorunlu", "Staff, at least one service and date/time are required", "Нужны сотрудник, хотя бы одна услуга и дата/время", "الموظف وخدمة واحدة على الأقل والتاريخ/الوقت مطلوبة", "Mitarbeitende/r, mindestens eine Leistung sowie Datum/Uhrzeit sind erforderlich", "El profesional, al menos un servicio y la fecha/hora son obligatorios"],
  apptEditFieldsRequired: ["Personel, hizmet ve tarih/saat zorunlu", "Staff, service and date/time are required", "Нужны сотрудник, услуга и дата/время", "الموظف والخدمة والتاريخ/الوقت مطلوبة", "Mitarbeitende/r, Leistung sowie Datum/Uhrzeit sind erforderlich", "El profesional, el servicio y la fecha/hora son obligatorios"],
  apptCreated: ["Randevu oluşturuldu", "Appointment created", "Запись создана", "تم إنشاء الموعد", "Termin erstellt", "Cita creada"],
  apptCreateFailed: ["Randevu oluşturulamadı", "Could not create the appointment", "Не удалось создать запись", "تعذّر إنشاء الموعد", "Termin konnte nicht erstellt werden", "No se pudo crear la cita"],
  apptNotFound: ["Randevu bulunamadı", "Appointment not found", "Запись не найдена", "لم يتم العثور على الموعد", "Termin nicht gefunden", "Cita no encontrada"],
  apptUpdated: ["Randevu güncellendi", "Appointment updated", "Запись обновлена", "تم تحديث الموعد", "Termin aktualisiert", "Cita actualizada"],
  // ── Gelir / gider ──
  noActiveTemplate: ["Aktif şablon yok — önce şablon ekleyin", "No active template — add a template first", "Нет активного шаблона — сначала добавьте шаблон", "لا يوجد قالب نشط — أضف قالبًا أولاً", "Keine aktive Vorlage – fügen Sie zuerst eine Vorlage hinzu", "No hay plantilla activa: añade una primero"],
  recurringAdded: ["{n} sabit gider {month} {year}'e eklendi", "{n} recurring expenses added to {month} {year}", "{n} постоянных расходов добавлено за {month} {year}", "تمت إضافة {n} مصروفات ثابتة إلى {month} {year}", "{n} wiederkehrende Ausgaben zu {month} {year} hinzugefügt", "Se añadieron {n} gastos fijos a {month} {year}"],
  amountDescRequired: ["Tutar ve açıklama zorunlu", "Amount and description are required", "Укажите сумму и описание", "المبلغ والوصف مطلوبان", "Betrag und Beschreibung sind erforderlich", "El importe y la descripción son obligatorios"],
  templateUpdated: ["Şablon güncellendi", "Template updated", "Шаблон обновлён", "تم تحديث القالب", "Vorlage aktualisiert", "Plantilla actualizada"],
  templateAdded: ["Şablon eklendi", "Template added", "Шаблон добавлен", "تمت إضافة القالب", "Vorlage hinzugefügt", "Plantilla añadida"],
  templateDeleted: ["Şablon silindi", "Template deleted", "Шаблон удалён", "تم حذف القالب", "Vorlage gelöscht", "Plantilla eliminada"],
  expenseSaved: ["{name} için gider kaydedildi", "Expense saved for {name}", "Расход для {name} сохранён", "تم حفظ المصروف لـ {name}", "Ausgabe für {name} gespeichert", "Gasto guardado para {name}"],
  // ── Kampanya ──
  campaignNameRequired: ["Kampanya adı zorunlu", "Campaign name is required", "Укажите название кампании", "اسم الحملة مطلوب", "Kampagnenname ist erforderlich", "El nombre de la campaña es obligatorio"],
  messageTemplateRequired: ["Mesaj şablonu zorunlu", "Message template is required", "Укажите шаблон сообщения", "قالب الرسالة مطلوب", "Nachrichtenvorlage ist erforderlich", "La plantilla del mensaje es obligatoria"],
  kvkkRequired: ["KVKK onayı zorunludur. Müşterilerin rızasını doğrulayın.", "Data-protection (KVKK) confirmation is required. Verify your customers' consent.", "Требуется подтверждение по закону о защите данных (KVKK). Убедитесь в согласии клиентов.", "تأكيد حماية البيانات (KVKK) مطلوب. تحقق من موافقة عملائك.", "Die Bestätigung zum Datenschutz (KVKK) ist erforderlich. Prüfen Sie die Einwilligung Ihrer Kundschaft.", "Se requiere la confirmación de protección de datos (KVKK). Verifica el consentimiento de tus clientes."],
  iysRequired: ["İYS beyanı zorunludur. Ticari elektronik ileti gönderen işletme İYS'ye kayıtlı olmalı ve onayları İYS'ye yüklemiş olmalıdır.", "The IYS declaration is required. A business sending commercial electronic messages must be registered with IYS and have uploaded consents to it.", "Требуется декларация IYS. Компания, рассылающая коммерческие электронные сообщения, должна быть зарегистрирована в IYS и загрузить туда согласия.", "إقرار IYS مطلوب. يجب أن تكون المنشأة التي ترسل رسائل تجارية إلكترونية مسجّلة في IYS وأن تكون قد رفعت الموافقات إليه.", "Die IYS-Erklärung ist erforderlich. Unternehmen, die kommerzielle elektronische Nachrichten versenden, müssen bei IYS registriert sein und die Einwilligungen dort hinterlegt haben.", "Se requiere la declaración IYS. Un negocio que envía mensajes electrónicos comerciales debe estar registrado en IYS y haber cargado los consentimientos."],
  selectCustomer: ["En az bir müşteri seçin veya 'Tüm onaylı müşteriler'i işaretleyin", "Select at least one customer or tick 'All consented customers'", "Выберите хотя бы одного клиента или отметьте «Все клиенты с согласием»", "اختر عميلًا واحدًا على الأقل أو حدّد «جميع العملاء الموافقين»", "Wählen Sie mindestens eine Person aus oder markieren Sie „Alle Kunden mit Einwilligung“", "Selecciona al menos un cliente o marca «Todos los clientes con consentimiento»"],
  discountPositive: ["İndirim değeri 0'dan büyük olmalı", "Discount value must be greater than 0", "Размер скидки должен быть больше 0", "يجب أن تكون قيمة الخصم أكبر من 0", "Der Rabattwert muss größer als 0 sein", "El descuento debe ser mayor que 0"],
  percentMax: ["Yüzde indirim en fazla 100 olabilir", "A percentage discount can be at most 100", "Процентная скидка не может превышать 100", "لا يمكن أن يتجاوز الخصم بالنسبة المئوية 100", "Ein prozentualer Rabatt darf höchstens 100 betragen", "Un descuento porcentual no puede superar 100"],
  validUntilRequired: ["İndirim için son geçerlilik tarihi zorunlu", "A last valid date is required for the discount", "Для скидки нужна дата окончания действия", "تاريخ انتهاء صلاحية الخصم مطلوب", "Für den Rabatt ist ein Ablaufdatum erforderlich", "El descuento necesita una fecha de validez"],
  campaignCreated: ["Kampanya oluşturuldu — şimdi gönderebilirsiniz", "Campaign created — you can send it now", "Кампания создана — теперь её можно отправить", "تم إنشاء الحملة — يمكنك إرسالها الآن", "Kampagne erstellt – Sie können sie jetzt senden", "Campaña creada: ya puedes enviarla"],
  campaignSent: ["Kampanya gönderildi: {n} kişiye ulaştı", "Campaign sent: reached {n} people", "Кампания отправлена: доставлено {n} получателям", "تم إرسال الحملة: وصلت إلى {n} شخصًا", "Kampagne gesendet: {n} Personen erreicht", "Campaña enviada: llegó a {n} personas"],
  // ── Müşteri ──
  customerAdded: ["Müşteri eklendi", "Customer added", "Клиент добавлен", "تمت إضافة العميل", "Kunde hinzugefügt", "Cliente añadido"],
  photoDeleted: ["Fotoğraf silindi", "Photo deleted", "Фото удалено", "تم حذف الصورة", "Foto gelöscht", "Foto eliminada"],
  photosBoth: ["Önce ve sonra fotoğraflarının ikisini de seçin", "Select both the before and after photos", "Выберите оба фото: «до» и «после»", "اختر صورتي «قبل» و«بعد» معًا", "Wählen Sie sowohl das Vorher- als auch das Nachher-Foto aus", "Selecciona las fotos de antes y de después"],
  photoConsent: ["Devam etmek için müşteri rızası onayını işaretleyin", "Tick the customer consent box to continue", "Отметьте согласие клиента, чтобы продолжить", "حدّد مربع موافقة العميل للمتابعة", "Markieren Sie die Einwilligung der Kundschaft, um fortzufahren", "Marca la casilla de consentimiento del cliente para continuar"],
  photosAdded: ["Fotoğraflar eklendi", "Photos added", "Фото добавлены", "تمت إضافة الصور", "Fotos hinzugefügt", "Fotos añadidas"],
  packageFields: ["Paket adı ve seans sayısı gerekli", "Package name and number of sessions are required", "Укажите название пакета и число сеансов", "اسم الباقة وعدد الجلسات مطلوبان", "Paketname und Anzahl der Sitzungen sind erforderlich", "El nombre del paquete y el número de sesiones son obligatorios"],
  packageSold: ["Paket satıldı", "Package sold", "Пакет продан", "تم بيع الباقة", "Paket verkauft", "Paquete vendido"],
  packageCancelled: ["Paket iptal edildi", "Package cancelled", "Пакет отменён", "تم إلغاء الباقة", "Paket storniert", "Paquete cancelado"],
  consentLinkReady: ["Onay linki hazırlandı (7 gün geçerli).", "Consent link ready (valid for 7 days).", "Ссылка для согласия готова (действует 7 дней).", "رابط الموافقة جاهز (صالح لمدة 7 أيام).", "Einwilligungslink bereit (7 Tage gültig).", "Enlace de consentimiento listo (válido 7 días)."],
  copyFailed: ["Kopyalanamadı — linki elle seçip kopyalayın.", "Could not copy — select the link and copy it manually.", "Не удалось скопировать — выделите ссылку и скопируйте вручную.", "تعذّر النسخ — حدّد الرابط وانسخه يدويًا.", "Kopieren fehlgeschlagen – markieren Sie den Link und kopieren Sie ihn manuell.", "No se pudo copiar: selecciona el enlace y cópialo manualmente."],
  // ── Personel ──
  staffAdded: ["Personel eklendi", "Staff member added", "Сотрудник добавлен", "تمت إضافة الموظف", "Mitarbeitende/r hinzugefügt", "Profesional añadido"],
  staffNotFound: ["Personel bulunamadı", "Staff member not found", "Сотрудник не найден", "لم يتم العثور على الموظف", "Mitarbeitende/r nicht gefunden", "Profesional no encontrado"],
  staffDeactivated: ["Personel pasife alındı", "Staff member deactivated", "Сотрудник деактивирован", "تم تعطيل الموظف", "Mitarbeitende/r deaktiviert", "Profesional desactivado"],
  timeOffAdded: ["İzin eklendi", "Time off added", "Отпуск добавлен", "تمت إضافة الإجازة", "Abwesenheit hinzugefügt", "Ausencia añadida"],
  timeOffDeleteFailed: ["İzin silinemedi", "Could not delete time off", "Не удалось удалить отпуск", "تعذّر حذف الإجازة", "Abwesenheit konnte nicht gelöscht werden", "No se pudo eliminar la ausencia"],
  closedDayAdded: ["Kapalı gün eklendi", "Closed day added", "Выходной день добавлен", "تمت إضافة يوم مغلق", "Schließtag hinzugefügt", "Día cerrado añadido"],
  // ── Stok ──
  stockLoadFailed: ["Stok verileri yüklenemedi", "Failed to load stock data", "Не удалось загрузить данные склада", "تعذّر تحميل بيانات المخزون", "Lagerdaten konnten nicht geladen werden", "No se pudieron cargar los datos de stock"],
  sampleCatalogAdded: ["Örnek stok kataloğu eklendi!", "Sample stock catalog added!", "Пример каталога склада добавлен!", "تمت إضافة نموذج كتالوج المخزون!", "Beispiel-Lagerkatalog hinzugefügt!", "¡Catálogo de stock de ejemplo añadido!"],
  catalogFailed: ["Katalog eklenemedi", "Could not add the catalog", "Не удалось добавить каталог", "تعذّرت إضافة الكتالوج", "Katalog konnte nicht hinzugefügt werden", "No se pudo añadir el catálogo"],
  productNameRequired: ["Ürün adı zorunludur", "Product name is required", "Укажите название товара", "اسم المنتج مطلوب", "Produktname ist erforderlich", "El nombre del producto es obligatorio"],
  productDeleted: ["Ürün silindi", "Product deleted", "Товар удалён", "تم حذف المنتج", "Produkt gelöscht", "Producto eliminado"],
  productDeleteFailed: ["Ürün silinemedi", "Could not delete the product", "Не удалось удалить товар", "تعذّر حذف المنتج", "Produkt konnte nicht gelöscht werden", "No se pudo eliminar el producto"],
  validQty: ["Geçerli bir miktar girin", "Enter a valid quantity", "Введите корректное количество", "أدخل كمية صحيحة", "Geben Sie eine gültige Menge ein", "Introduce una cantidad válida"],
  stockMoveSaved: ["Stok hareketi kaydedildi", "Stock movement saved", "Движение товара сохранено", "تم حفظ حركة المخزون", "Lagerbewegung gespeichert", "Movimiento de stock guardado"],
  // ── Veri göçü ──
  downloaded: ["Veriler indirildi!", "Data downloaded!", "Данные загружены!", "تم تنزيل البيانات!", "Daten heruntergeladen!", "¡Datos descargados!"],
  downloadFailed: ["İndirme başarısız.", "Download failed.", "Не удалось скачать.", "فشل التنزيل.", "Download fehlgeschlagen.", "La descarga falló."],
  pickSource: ["Lütfen kaynak seçin.", "Please select a source.", "Выберите источник.", "يرجى اختيار المصدر.", "Bitte wählen Sie eine Quelle.", "Selecciona un origen."],
  imported: ["{n} kayıt başarıyla aktarıldı!{detail}", "{n} records imported successfully!{detail}", "Успешно импортировано записей: {n}!{detail}", "تم استيراد {n} سجل بنجاح!{detail}", "{n} Einträge erfolgreich importiert!{detail}", "¡{n} registros importados correctamente!{detail}"],
  nothingImported: ["Yeni kayıt eklenmedi.{detail}", "No new records were added.{detail}", "Новых записей не добавлено.{detail}", "لم تتم إضافة سجلات جديدة.{detail}", "Es wurden keine neuen Einträge hinzugefügt.{detail}", "No se añadieron registros nuevos.{detail}"],
  dupExisted: ["{n} kayıt zaten mevcuttu", "{n} records already existed", "{n} записей уже существовало", "{n} سجل موجود مسبقًا", "{n} Einträge waren bereits vorhanden", "{n} registros ya existían"],
  rowsSkipped: ["{n} satır atlandı", "{n} rows skipped", "Пропущено строк: {n}", "تم تخطي {n} صف", "{n} Zeilen übersprungen", "{n} filas omitidas"],
  importFailed: ["İçe aktarma başarısız.", "Import failed.", "Не удалось импортировать.", "فشل الاستيراد.", "Import fehlgeschlagen.", "La importación falló."],
  // ── Rehber ──
  copyProtected: ["SiriPlan kılavuz içerikleri telif hakkı ile korunmaktadır ve kopyalanamaz.", "SiriPlan guide content is protected by copyright and cannot be copied.", "Материалы руководства SiriPlan защищены авторским правом и не подлежат копированию.", "محتوى دليل SiriPlan محمي بحقوق النشر ولا يمكن نسخه.", "Die Inhalte des SiriPlan-Leitfadens sind urheberrechtlich geschützt und dürfen nicht kopiert werden.", "El contenido de la guía de SiriPlan está protegido por derechos de autor y no se puede copiar."],
  devToolsBlocked: ["Bu sayfada geliştirici araçları ve kopyalama kısıtlanmıştır.", "Developer tools and copying are restricted on this page.", "На этой странице ограничены инструменты разработчика и копирование.", "أدوات المطوّر والنسخ مقيّدة في هذه الصفحة.", "Entwicklertools und Kopieren sind auf dieser Seite eingeschränkt.", "Las herramientas de desarrollador y la copia están restringidas en esta página."],
} as const satisfies Record<string, Row>;

export type ToastKey = keyof typeof M;

function currentLang(): number {
  try {
    if (typeof document !== "undefined") {
      const l = (document.documentElement.lang || "").slice(0, 2).toLowerCase();
      if (l in LANG_INDEX) return LANG_INDEX[l];
    }
  } catch {
    // erişilemezse Türkçe
  }
  return 0;
}

/** Toast metnini aktif dilde döndürür; `vars` ile {yer} tutucuları doldurulur. */
export function tm(key: ToastKey, vars?: Record<string, string | number>): string {
  const row = M[key] as Row;
  let text = row[currentLang()] || row[0];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) text = text.split(`{${k}}`).join(String(v));
  }
  return text;
}
