"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale as DateFnsLocale } from "date-fns";
import { useTranslations } from "next-intl";
import { Clock, MapPin, ChevronRight, CalendarCheck } from "lucide-react";
import type { Service } from "@/types/database";
import type { SalonData } from "./booking-shared";
import { buildCategoryGroups, minPrice } from "./booking-shared";
import { formatServicePrice } from "@/lib/currency";
import { BookingWizard } from "./BookingWizard";
import { PhotoLightbox } from "./PhotoLightbox";
import { LanguageSwitcher, QuickLinks, WorkingHours } from "./SalonBits";
import type { LanguageCode } from "@/lib/languages";

/**
 * ŞABLON 2 — "Vitrin / Mini Web Sitesi".
 *
 * Amaç: salonun işini önce GÖSTERMEK. Tam genişlik kapak, kategori kartları,
 * foto galerisi ve bilgi şeridi üstte; randevu sihirbazı sayfanın altında
 * (#randevu). Mobilde ekranın altına sabitlenen "Randevu Al" butonu her an
 * forma götürür — tek elle kullanım için ana etkileşim ekranın alt yarısında.
 *
 * Google/müşteri yorumları bölümü BİLİNÇLİ olarak yok: yorum verisi platformda
 * tutulmuyor, uydurma yorum göstermek de yanıltıcı olur. Salonun Google yorum
 * bağlantısı varsa yalnızca bir kısayol düğmesi olarak görünür.
 */
export function ShowcaseLayout({
  salon, dateLocale, lang, onLangChange, onDetectedLanguage,
}: {
  salon: SalonData;
  dateLocale: DateFnsLocale;
  lang: LanguageCode;
  onLangChange: (l: LanguageCode) => void;
  onDetectedLanguage: (l: LanguageCode) => void;
}) {
  const t = useTranslations("booking.public");
  const { org, services, categories, localizeName } = salon;

  const [lightbox, setLightbox] = useState<{ photos: { id: string; url: string }[]; index: number } | null>(null);
  const [picked, setPicked] = useState<{ service: Service; token: number } | null>(null);
  const [bookingDone, setBookingDone] = useState(false);
  // Randevu bölümü ekranda görünür olunca sabit "Randevu Al" CTA'sı gizlenir —
  // aksi halde ziyaretçi sihirbazın içindeyken (ör. "Devam Et"/"Randevuyu Onayla"
  // ile aynı anda) altta işlevsiz, kafa karıştırıcı ikinci bir buton görüyordu.
  const [bookingInView, setBookingInView] = useState(false);
  const tokenRef = useRef(0);
  const bookingRef = useRef<HTMLDivElement | null>(null);

  const scrollToBooking = useCallback(() => {
    bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const el = bookingRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setBookingInView(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function pickService(service: Service) {
    tokenRef.current += 1;
    setPicked({ service, token: tokenRef.current });
    // Seçim state'i yerleştikten sonra kaydır — aksi halde henüz yüksekliği
    // değişmemiş bölüme kayıp yarım ekran boşluğa bakılıyordu.
    requestAnimationFrame(scrollToBooking);
  }

  const groups = buildCategoryGroups(categories, services).filter(
    (g) => g.items.length > 0 || g.photos.length > 0 || g.category.photo_url
  );
  const uncategorized = services.filter((s) => !s.category_id);

  return (
    <>
      {/* ---------- HERO ---------- */}
      <header className="relative">
        <div className="relative h-[62vh] min-h-[380px] max-h-[560px] w-full overflow-hidden">
          {org.cover_url ? (
            <img src={org.cover_url} alt={org.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--accent) 60%, var(--primary)))" }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/25" />

          <div className="absolute top-3 right-3 rounded-xl bg-black/30 backdrop-blur-sm px-1">
            <LanguageSwitcher lang={lang} onChange={onLangChange} />
          </div>

          <div className="absolute inset-x-0 bottom-0">
            <div className="max-w-3xl mx-auto px-5 pb-7 space-y-4">
              <div className="flex items-end gap-3.5">
                {org.logo_url ? (
                  <img
                    src={org.logo_url}
                    alt={org.name}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-white/70 shadow-xl shrink-0"
                  />
                ) : null}
                <div className="min-w-0">
                  {org.city && (
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 mb-1">{org.city}</p>
                  )}
                  <h1 className="font-heading text-3xl sm:text-5xl font-bold text-white leading-[1.05] text-balance drop-shadow">
                    {org.name}
                  </h1>
                </div>
              </div>

              {org.website_tagline && (
                <p className="text-sm sm:text-base text-white/85 leading-relaxed max-w-xl">{org.website_tagline}</p>
              )}

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={scrollToBooking}
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-full font-semibold text-primary-foreground shadow-xl shadow-black/25 transition-transform active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--accent) 55%, var(--primary)))" }}
                >
                  <CalendarCheck className="h-4.5 w-4.5" /> {t("bookNowButton")}
                </button>
                <QuickLinks org={org} tone="solid" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- KATEGORİLER + GALERİ ---------- */}
      <main className="max-w-3xl mx-auto px-4 sm:px-5 py-10 space-y-12">
        {groups.length > 0 && (
          <section className="space-y-8">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
                {t("showcaseServicesEyebrow")}
              </span>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold">{t("showcaseServicesTitle")}</h2>
            </div>

            {groups.map(({ category, items, photos }) => {
              const from = minPrice(items);
              const lightboxPhotos = photos.map((p) => ({ id: p.id, url: p.url }));
              return (
                <article
                  key={category.id}
                  className="rounded-3xl border border-border/70 bg-card/70 backdrop-blur-sm overflow-hidden shadow-sm"
                >
                  {/* Kategori kapak şeridi */}
                  {category.photo_url && (
                    <div className="relative h-36 sm:h-44 w-full overflow-hidden">
                      <img src={category.photo_url} alt={localizeName(category.name)} loading="lazy" className="w-full h-full object-cover" />
                      {/* Kategori kapağı salonun kendi yüklediği fotoğraf — açık tonlu
                          bir fotoğrafta beyaz başlık okunmaz hâle geliyordu. Alt yarıya
                          güçlü bir karartma + metne gölge: her fotoğrafta okunur kalır. */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <h3 className="font-heading text-xl sm:text-2xl font-bold text-white [text-shadow:0_1px_6px_rgb(0_0_0/0.6)]">
                          {localizeName(category.name)}
                        </h3>
                        <p className="text-xs text-white/85 [text-shadow:0_1px_4px_rgb(0_0_0/0.6)]">
                          {t("servicesCount", { count: items.length })}
                          {from !== null ? ` · ${t("fromPrice", { price: formatServicePrice(from, items[0]?.currency) })}` : ""}
                        </p>
                      </div>
                    </div>
                  )}
                  {!category.photo_url && (
                    <div className="p-4 pb-0">
                      <h3 className="font-heading text-xl font-bold">{localizeName(category.name)}</h3>
                      <p className="text-xs text-muted-foreground">{t("servicesCount", { count: items.length })}</p>
                    </div>
                  )}

                  {/* Galeri mozaiği — mobilde 3, geniş ekranda 4 sütun */}
                  {photos.length > 0 && (
                    <div className="p-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {photos.map((p, i) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setLightbox({ photos: lightboxPhotos, index: i })}
                          className="relative aspect-square rounded-xl overflow-hidden group cursor-zoom-in"
                        >
                          <img
                            src={p.url}
                            alt={localizeName(category.name)}
                            loading="lazy"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Hizmet satırları */}
                  {items.length > 0 && (
                    <ul className="divide-y divide-border/60">
                      {items.map((s) => (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => pickService(s)}
                            className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-primary/5 active:bg-primary/10"
                          >
                            {s.photo_url && (
                              <img src={s.photo_url} alt="" loading="lazy" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold truncate">{localizeName(s.name)}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <Clock className="h-3 w-3" />
                                {s.duration_minutes} {t("minutesShort")}
                              </p>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-1">
                              <span className="font-heading text-lg font-bold text-primary tabular-nums">
                                {formatServicePrice(s.price, s.currency)}
                              </span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}

            {uncategorized.length > 0 && (
              <article className="rounded-3xl border border-border/70 bg-card/70 backdrop-blur-sm overflow-hidden">
                <div className="p-4 pb-0">
                  <h3 className="font-heading text-xl font-bold">{t("otherServices")}</h3>
                </div>
                <ul className="divide-y divide-border/60 mt-3">
                  {uncategorized.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => pickService(s)}
                        className="w-full flex items-center gap-3 p-4 text-left transition-colors hover:bg-primary/5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{localizeName(s.name)}</p>
                          <p className="text-xs text-muted-foreground">{s.duration_minutes} {t("minutesShort")}</p>
                        </div>
                        <span className="font-heading text-lg font-bold text-primary tabular-nums shrink-0">
                          {formatServicePrice(s.price, s.currency)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </article>
            )}
          </section>
        )}

        {/* ---------- BİLGİ ŞERİDİ ---------- */}
        {(org.address || org.location_url || org.phone) && (
          <section className="grid gap-4 sm:grid-cols-2">
            <WorkingHours org={org} />
            {(org.address || org.location_url) && (
              <div className="rounded-2xl border border-border/70 bg-card/70 backdrop-blur-sm p-4">
                <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/70 mb-3">
                  <MapPin className="h-3.5 w-3.5" /> {t("locationTitle")}
                </p>
                {org.address && <p className="text-sm leading-relaxed">{org.address}</p>}
                {org.city && <p className="text-sm text-muted-foreground">{org.city}</p>}
                <div className="mt-3">
                  <QuickLinks org={org} />
                </div>
              </div>
            )}
          </section>
        )}

        {/* ---------- RANDEVU ---------- */}
        <section ref={bookingRef} id="randevu" className="scroll-mt-4">
          <div className="mb-6">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
              {t("bookingSectionEyebrow")}
            </span>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold">{t("bookingSectionTitle")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("bookingSectionSubtitle")}</p>
          </div>
          <div className="rounded-3xl border border-border/70 bg-card/70 backdrop-blur-sm p-4 sm:p-6">
            <BookingWizard
              salon={salon}
              dateLocale={dateLocale}
              preselected={picked}
              hideServiceStep
              showSteps={false}
              onDone={setBookingDone}
              onDetectedLanguage={onDetectedLanguage}
            />
          </div>
        </section>
      </main>

      {/* Mobilde sabit CTA — randevu tamamlandıysa veya randevu bölümü zaten
          ekrandaysa (sihirbazın kendi "Devam Et"/"Randevuyu Onayla" butonuyla
          çakışmaması için) gizlenir */}
      {!bookingDone && !bookingInView && (
        <div className="sm:hidden sticky bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 bg-gradient-to-t from-background via-background/95 to-transparent">
          <button
            type="button"
            onClick={scrollToBooking}
            className="w-full h-12 rounded-2xl font-semibold text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
            style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in oklch, var(--accent) 55%, var(--primary)))" }}
          >
            <CalendarCheck className="h-4.5 w-4.5" /> {t("bookNowButton")}
          </button>
        </div>
      )}

      <PhotoLightbox
        photos={lightbox?.photos ?? []}
        index={lightbox ? lightbox.index : null}
        onClose={() => setLightbox(null)}
        onNavigate={(index) => setLightbox((l) => (l ? { ...l, index } : l))}
        closeLabel={t("closeLabel")}
      />
    </>
  );
}
