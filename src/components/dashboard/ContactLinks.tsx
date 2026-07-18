"use client";

import { Phone, Mail, MessageCircle } from "lucide-react";

/** Telefonu wa.me formatına çevirir: "0532 111 22 33" → "905321112233" */
export function toWaPhone(phone: string) {
  return phone.replace(/\D/g, "").replace(/^0/, "90");
}

/**
 * Kart içinde (Link ile sarılı alanlarda) kullanılan ara / WhatsApp /
 * e-posta kısayolları. Server component'te onClick kullanılamadığı için
 * client component — tıklamada kartın kendi navigasyonunu durdurur.
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
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <span className="inline-flex gap-1 shrink-0">
      {phone && (
        <>
          <a
            href={`tel:${phone}`}
            title="Ara"
            className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500 transition-colors"
            onClick={stop}
          >
            <Phone className={icon} />
          </a>
          <a
            href={`https://wa.me/${toWaPhone(phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            title="WhatsApp"
            className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/20 text-green-500 transition-colors"
            onClick={stop}
          >
            <MessageCircle className={icon} />
          </a>
        </>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          title="E-posta gönder"
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-primary transition-colors"
          onClick={stop}
        >
          <Mail className={icon} />
        </a>
      )}
    </span>
  );
}
