# App Store Connect — Almanca ve İspanyolca mağaza metinleri (SiriusPlan)

> Hazırlayan: 14 Ekim 2026. Bunlar TASLAKTIR; App Store Connect'te sürümün **App Store Localizations** bölümüne dil ekleyip yapıştır.
> Apple dil adları: Almanca = **German**, İspanyolca = **Spanish (Spain)** (isteğe bağlı **Spanish (Mexico)** — aynı metin kullanılabilir).
> **Yeni build GEREKMEZ**: mağaza metni, anahtar kelime ve ekran görüntüleri build'den bağımsızdır.

## Apple'ı kızdırmamak için (4 ret dersi — DEVAM-NOTLARI)
- Metinde **WhatsApp, Instagram, Telegram, Siri, Google** gibi 3. parti/Apple marka adı YOK (betikle denetlendi).
- Fiyat, plan, abonelik, ödeme yönlendirmesi YOK. Uygulama adı iOS'ta **SiriusPlan** (SiriPlan değil).
- Review Notes'taki "In-app registration…" metni zaten var; yeni dil için değişiklik gerekmez.
- Ekran görüntüleri: şimdilik mevcut TR/EN setleri kullanılabilir. Almanca/İspanyolca görsel istersen: `SCREENSHOT_LANG=de node scripts/app-store-screenshots-capture.mjs` (çıkışta demo hesabın dilini Türkçe'ye geri aldığını kontrol et).

## Almanca (German)

**Name (≤30):** `SiriusPlan`

**Subtitle (≤30):** `Termine & Salonverwaltung`

**Promotional Text (≤170):**
```
Terminplanung, Mitarbeiterkalender, Kundenkartei, Lager und Umsatzberichte – alles in einer App für Friseure, Barbershops und Beauty-Betriebe.
```

**Keywords (≤100, virgülle):**
```
Termine,Friseur,Barbier,Salon,Kosmetik,Kalender,Kunden,Buchung,Spa,Nagelstudio,Mitarbeiter,Planer
```

**Description (≤4000):**
```
SiriusPlan ist die Terminplanung und Betriebsverwaltung für Friseursalons, Barbershops, Beauty-, Nagel- und Wellness-Betriebe, Kliniken und viele weitere Dienstleister.

TERMINE UND KALENDER
• Mehrere Mitarbeitende in einem übersichtlichen Kalender
• Termine anlegen, bestätigen, verschieben oder stornieren
• Online-Buchungsseite, über die Ihre Kundschaft rund um die Uhr selbst Termine bucht
• Wartelisten und neue Terminvorschläge mit einem Fingertipp

KUNDEN UND LEISTUNGEN
• Kundenkartei mit Verlauf, Notizen und Fotos
• Leistungen, Preise und Dauer pro Mitarbeitende/r verwalten
• Pakete und Sitzungen nachverfolgen

LAGER UND KASSE
• Lagerbestand mit Warnung bei niedrigem Bestand
• Produktverkauf per Barcode-Scan mit der Kamera
• Einnahmen und Ausgaben, Tages- und Monatsberichte

TEAM UND KOMMUNIKATION
• Rollen und Berechtigungen für Inhaber, Leitung und Mitarbeitende
• Sofortige Benachrichtigungen auf dem iPhone bei neuen Terminen und Anfragen
• Sprachbefehle zum schnellen Anlegen von Terminen
• Verfügbar auf Deutsch, Englisch, Spanisch, Türkisch, Russisch und Arabisch

Erstellen Sie in der App ein kostenloses Testkonto und richten Sie Ihren Betrieb in wenigen Minuten ein.
```

**What's New (sürüm 1.2):**
```
Neu: SiriusPlan ist jetzt auch auf Deutsch und Spanisch verfügbar – zusätzlich zu Türkisch, Englisch, Russisch und Arabisch. Außerdem: Verbesserungen und Fehlerbehebungen.
```

## İspanyolca (Spanish)

**Name (≤30):** `SiriusPlan`

**Subtitle (≤30):** `Citas y gestión de salones`

**Promotional Text (≤170):**
```
Reservas, agenda del equipo, fichas de clientes, stock e informes de ingresos: todo en una app para peluquerías, barberías y negocios de belleza.
```

**Keywords (≤100, virgülle):**
```
citas,peluquería,barbería,salón,belleza,agenda,clientes,reservas,spa,uñas,personal,calendario
```

**Description (≤4000):**
```
SiriusPlan es la gestión de citas y del negocio para peluquerías, barberías, salones de belleza, uñas y bienestar, clínicas y muchos otros servicios.

CITAS Y AGENDA
• Varios profesionales en una agenda clara
• Crea, confirma, cambia o cancela citas
• Página de reservas en línea para que tus clientes reserven solos las 24 horas
• Lista de espera y nuevas propuestas de hora con un toque

CLIENTES Y SERVICIOS
• Ficha de cliente con historial, notas y fotos
• Gestiona servicios, precios y duración por profesional
• Seguimiento de paquetes y sesiones

STOCK Y CAJA
• Control de stock con aviso de existencias bajas
• Venta de productos escaneando el código de barras con la cámara
• Ingresos y gastos, informes diarios y mensuales

EQUIPO Y COMUNICACIÓN
• Roles y permisos para propietarios, responsables y personal
• Avisos inmediatos en el iPhone con cada nueva cita o solicitud
• Comandos de voz para crear citas rápidamente
• Disponible en español, inglés, alemán, turco, ruso y árabe

Crea una cuenta de prueba gratuita en la app y configura tu negocio en pocos minutos.
```

**What's New (sürüm 1.2):**
```
Novedad: SiriusPlan ya está disponible en español y alemán, además de turco, inglés, ruso y árabe. También incluye mejoras y correcciones de errores.
```

## İzin pencereleri (build gerektirir → 1.2)
Dosyalar: `docs/app-store/ios-lokalizasyon/<dil>.lproj/InfoPlist.strings` (en, tr, ru, ar, de, es). Kullanım için `siriplan-ios` deposunda:
1. Bu 6 `.lproj/InfoPlist.strings` dosyasını `src/SiriPlan/` altına koy.
2. Xcode projesine (`project.pbxproj`) **InfoPlist.strings variant group** olarak ekle, Resources build phase'e bağla; `knownRegions`'a de, es, ru, ar, tr ekle.
3. `Info.plist`'e `CFBundleLocalizations` ekle: en, tr, ru, ar, de, es (`CFBundleDevelopmentRegion` en kalsın).
4. Build numarasını artır (1.2), Codemagic → TestFlight → cihazda dili değiştirip izin penceresini doğrula.
Bu adım yarım kalırsa canlı 1.1'i etkilemez; yalnızca yeni build'in izin pencereleri İngilizce kalır.
