"use client";

import { Phone, Mail, MessageCircle, MessageSquare } from "lucide-react";
import { useIsIOSNativeApp } from "@/lib/use-mobile-app";

/** Telefonu wa.me formatına çevirir: "0532 111 22 33" → "905321112233" */
export function toWaPhone(phone: string) {
  return phone.replace(/\D/g, "").replace(/^0/, "90");
}

/**
 * Kart içinde (Link ile sarılı alanlarda) kullanılan ara / WhatsApp /
 * e-posta kısayolları. `<button>` olarak render edilir (`<a>` değil) —
 * bu bileşen her zaman bir `<Link>`/`<a>` içine yerleştirildiği için,
 * içeride de `<a>` kullanmak geçersiz "a içinde a" HTML iç içeliği
 * yaratıp hydration hatasına ve tıklamaların bozulmasına yol açıyordu.
 */
export function ContactLinks({
  phone,
  email,
  size = "sm",
}: {
  phone?: string | null;
  email?: string | null;
  size?: "sm" | "md";
}) {
  const icon = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  // App Store 2.3.10: iOS uygulamasında üçüncü taraf platformu çağrıştıran yeşil
  // sohbet balonu yerine nötr, marka renginde ikon. Bağlantı davranışı aynı.
  const isIOSApp = useIsIOSNativeApp();

  function go(e: React.MouseEvent, href: string, external?: boolean) {
    e.preventDefault();
    e.stopPropagation();
    if (external) {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = href;
    }
  }

  return (
    <span className="inline-flex gap-1 shrink-0">
      {phone && (
        <>
          <button
            type="button"
            title="Ara"
            className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
            onClick={(e) => go(e, `tel:${phone}`)}
          >
            <Phone className={icon} />
          </button>
          <button
            type="button"
            title="WhatsApp"
            className={`p-1 rounded transition-colors ${isIOSApp ? "hover:bg-accent text-primary" : "hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500"}`}
            onClick={(e) => go(e, `https://wa.me/${toWaPhone(phone)}`, true)}
          >
            {isIOSApp ? <MessageSquare className={icon} /> : <MessageCircle className={icon} />}
          </button>
        </>
      )}
      {email && (
        <button
          type="button"
          title="E-posta gönder"
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
          onClick={(e) => go(e, `mailto:${email}`)}
        >
          <Mail className={icon} />
        </button>
      )}
    </span>
  );
}
