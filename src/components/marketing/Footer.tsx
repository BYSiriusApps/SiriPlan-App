import Link from "next/link";
import { Sparkles } from "lucide-react";
import { BySiriusBadge } from "@/components/layout/BySiriusBadge";

const footerLinks = {
  product: [
    { label: "Özellikler", href: "/ozellikler" },
    { label: "Fiyatlar", href: "/fiyatlar" },
    { label: "Demo", href: "/demo" },
    { label: "Entegrasyonlar", href: "/entegrasyonlar" },
  ],
  categories: [
    { label: "Kuaför Programı", href: "/kategori/kuafor" },
    { label: "Berber Programı", href: "/kategori/berber" },
    { label: "Güzellik Salonu", href: "/kategori/guzellik" },
    { label: "SPA Programı", href: "/kategori/spa" },
    { label: "Nail Salon", href: "/kategori/nail" },
  ],
  company: [
    { label: "Hakkımızda", href: "/hakkimizda" },
    { label: "Blog", href: "/blog" },
    { label: "İletişim", href: "/iletisim" },
    { label: "Kariyer", href: "/kariyer" },
  ],
  legal: [
    { label: "Gizlilik Politikası", href: "/gizlilik" },
    { label: "Kullanım Koşulları", href: "/kosullar" },
    { label: "Çerez Politikası", href: "/cerezler" },
    { label: "KVKK", href: "/kvkk" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg brand-gradient flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-base">
                Siri<span className="text-primary">plan</span>
              </span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Her sektöre özel akıllı randevu yönetimi. AI destekli, çok kanallı, kesintisiz.
            </p>
            <BySiriusBadge variant="footer" />
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Ürün</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Kategoriler</h3>
            <ul className="space-y-2">
              {footerLinks.categories.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Şirket</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Yasal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} BY Sirius Group AI and Technology Co. Ltd. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>🇹🇷 Türkiye</span>
            <span>·</span>
            <BySiriusBadge variant="footer" />
          </div>
        </div>
      </div>
    </footer>
  );
}
