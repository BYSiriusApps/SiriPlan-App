/**
 * Müşteriye dönük "web sitesi görünümü" sayfalarının (randevu linki, randevu
 * detayı, iptal sayfası) altında yer alan sabit marka şeridi. Tüm dillerde
 * aynı metin kullanılır — çeviriye tabi değildir.
 */
export function PoweredByBadge({ className = "" }: { className?: string }) {
  return (
    <div className={`relative text-center py-6 ${className}`}>
      <a
        href="https://bysirius.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        ✨ SiriPlan powered BY Sirius Group
      </a>
    </div>
  );
}
