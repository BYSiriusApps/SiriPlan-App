import { ColdStartSplash } from "@/components/dashboard/ColdStartSplash";

/**
 * Bu dosya SADECE uygulamanın ilk açılışında tam ekran markalı açılış görseli
 * gösterir; panel içi sayfa geçişlerinde ince bir ilerleme çizgisine düşer.
 * Nedeni ve mekanizması için bkz. components/dashboard/ColdStartSplash.tsx.
 *
 * (Android TWA'da start_url="/dashboard" açıldığında native splash kapandıktan
 * sonra beyaz bir an yaşanmaması için aynı lacivert ton kullanılıyor —
 * public/manifest.json background_color ile eşleşir.)
 */
export default function DashboardLoading() {
  return <ColdStartSplash />;
}
